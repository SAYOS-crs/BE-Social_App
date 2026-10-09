// ─── Express type (still used by the private _GetAuthenticatedUser guard) ─────
import { Request } from "express";
// ─── DB model type ────────────────────────────────────────────────────────────
import { HUserDocument } from "../../DB/models/User.model"; // Mongoose hydrated user document type
// ─── User repository (data-access layer) ─────────────────────────────────────
import UserRepository from "../../DB/Repository/User.Repository";
// ─── Utilities ────────────────────────────────────────────────────────────────
import {
  AWS_SERVICE,            // singleton wrapper that exposes S3service, etc.
  AwsEnum,               // AWS-specific enums: AssetType, FolderType, download
  BadRequstExption,      // 400-level typed error
  ConflictExption,       // 409-level typed error (e.g. duplicate FCM token)
  NotificationService,   // Firebase Cloud Messaging (FCM) send helper
  s3PathKeyPrefix,       // builds a structured S3 key prefix (folder/id/type/filename)
  StorageAprotches,      // enum: Memory | Disk (multer storage strategy)
  UnAuthroizedExption,   // 401-level typed error
} from "../../Utils";

// ─── Node / AWS SDK types ─────────────────────────────────────────────────────
// - S3_ReadStream = transform pipeline from callback to async
import { DeletedObject } from "@aws-sdk/client-s3"; // shape returned by S3 bulk-delete
import { log } from "node:console"; // lightweight console.log alias

// ─── DTOs (Data Transfer Objects) ─────────────────────────────────────────────
import {
  AssetPayloadDTO,              // input: { user, file }  (single-file upload)
  AssetsPayloadDTO,             // input: { user, files } (multi-file upload)
  AssetsPayloadPresignedUrlDTO, // input: { user, ContentType, Originalname }
  Delete_AssetPayloadDTO,       // input: { user, Key }
  Delete_AssetsPayloadDTO,      // input: { user, Keys: string[] }
  DeleteAssetDTO,               // output: { DeleteMark, result }
  DeleteAssetsDTO,              // output: { Deleted: DeletedObject[], result }
  DeleteUserProfileDTO,         // output: { DeletedUser, DeletedAssets }
  FCM_TokenDTO,                 // output: { token, result }
  FCM_TokenPayloadDTO,          // input: { token } (Zod-inferred from AssignFcmTokenSchema)
  getUserAssetDTO,              // output: { Body, ContentType }
  PresignedUrlDTO,              // output: { payload: { Key, link }, result }
  Retrieve_PresignedURLDTO,     // input: query params for presigned-URL retrieval
  SendNotificationPayloadDTO,   // input: { user, data: { title, body } }
  UploadAssetDTO,               // output: { Key, result }
  UploadAssetsDTO,              // output: { Keys: string[], result }
} from "./user.dto";

// ─────────────────────────────────────────────────────────────────────────────
// UserService — central business-logic layer for all user-related operations.
// Instantiated as a singleton at the bottom of this file and exported.
// ─────────────────────────────────────────────────────────────────────────────
export class UserService {
  // Firebase notification helper (static singleton)
  private _NotificationService = NotificationService;

  // Mongoose repository providing CRUD helpers for the User collection
  private _UserRepository = new UserRepository();

  // Pre-configured AWS S3 service (upload, download, delete, presign)
  private readonly _AWS_S3 = AWS_SERVICE.S3service;

  constructor() {}

  // ─── Private guard ──────────────────────────────────────────────────────────
  /**
   * _GetAuthenticatedUser
   * Takes  : req — the Express Request object
   * Does   : checks that req.user exists (populated by the Authentication middleware)
   * Returns: HUserDocument — the authenticated user's Mongoose document
   * Throws : UnAuthroizedExption (401) if req.user is missing
   */
  private _GetAuthenticatedUser = (req: Request): HUserDocument => {
    if (!req.user) {
      throw new UnAuthroizedExption("User is not authenticated");
    }
    return req.user;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ──────────────────────────── Profile / User  ─────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * DeleteUserProfile
   * Takes  : user — the authenticated HUserDocument to delete
   * Does   :
   *   step 1 → hard-deletes the user document from MongoDB
   *   step 2 → if the user had any S3 assets (UserImage or CoverImage),
   *            bulk-deletes all objects under "User/<userId>/" prefix in S3
   *   step 3 → returns both the deleted document and the S3 deletion result
   * Returns: DeleteUserProfileDTO → { DeletedUser: HUserDocument, DeletedAssets: DeletedObject[] | undefined }
   */
  public DeleteUserProfile = async (
    user: HUserDocument,
  ): Promise<DeleteUserProfileDTO> => {
    // step 1: permanently remove the user document from the DB; returns the deleted doc
    const DeletedUser = await this._UserRepository.DeleteOne({ _id: user._id });

    let DeletedAssets; // will hold S3 deletion results if assets exist

    // step 2: only attempt S3 cleanup if the user actually had uploaded assets
    if (DeletedUser.CoverImage?.length || DeletedUser.UserImage) {
      // bulk-delete every object under the "User/<id>/" S3 prefix
      DeletedAssets = await this._AWS_S3.DeleteAssetsByPrefix({
        folder: "User", // top-level S3 folder name
        id: user.id,    // user ID used to build the prefix path
      });
    }
    console.log(DeletedAssets); // debug: inspect what S3 returned

    // step 3: return both the Mongoose document and the S3 result for the controller
    return { DeletedUser, DeletedAssets };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ─────────────────────────── Upload Assets ────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * AddUserPhoto
   * Takes  : { user, file } — AssetPayloadDTO
   *   • user : authenticated user document (provides id for S3 key path)
   *   • file : multer File from memory storage (has .buffer)
   * Does   :
   *   1. Uploads the file buffer to S3 under "User/<id>/Profile/<originalname>" path
   *   2. If upload fails, throws 400
   *   3. Saves the returned S3 Key as the user's UserImage field in DB (overwrites previous)
   *   4. If DB update fails, rolls back by deleting the newly uploaded S3 object
   * Returns: UploadAssetDTO → { Key: string, result: UpdateWriteOpResult }
   */
  public AddUserPhoto = async ({
    user,
    file,
  }: AssetPayloadDTO): Promise<UploadAssetDTO> => {
    // build the S3 object key and upload the file buffer; returns the Key string
    const Key = await this._AWS_S3.UploadFile({
      file,
      path: s3PathKeyPrefix({
        AssetType: AwsEnum.AssetType.Profile, // marks this as a profile image
        file,
        folder: AwsEnum.FolderType.User,      // top-level S3 folder
        id: user.id,                           // unique path segment per user
      }),
    });

    // debug: log the file mime/name that reached this service
    console.log(
      "file mimetype & originalname of AddUserPhoto endpint : ",
      file.mimetype,
      file.originalname,
    );

    // guard: S3 must return a Key; if not, something went wrong on the AWS side
    if (!Key)
      throw new BadRequstExption(
        "Error while Uploading Asset to AWS Service !",
      );

    console.log("s3 file key :", Key); // debug: confirm the key that was stored

    // save the S3 Key into the user's UserImage field (replaces any previous value)
    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id }, // always query by _id (never virtual id)
      update: { UserImage: Key },
    });

    // rollback: if DB update failed, delete the freshly uploaded S3 object to avoid orphans
    if (!result) {
      if (Key) {
        await this._AWS_S3.DeleteAsset({ Key });
      }
      throw new BadRequstExption("error while setting user photo");
    }

    // return the S3 key and the MongoDB update result to the controller
    return { result, Key };
  };

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * AddUserLargeFile
   * Takes  : { user, file } — AssetPayloadDTO
   *   • user : authenticated user document
   *   • file : multer File from disk storage (has .path — temp file on server disk)
   * Does   :
   *   3. Streams the temp file to S3 via multipart upload (handles files > 5 MB)
   *      Uses the Disk storage approach so the stream reads from the temp path.
   *   4. Pushes the returned S3 Key into the user's CoverImage array in DB
   *   Rolls back the S3 upload if the DB update fails
   * Returns: UploadAssetDTO | never → { Key: string, result: UpdateWriteOpResult }
   */
  public AddUserLargeFile = async ({
    user,
    file,
  }: AssetPayloadDTO): Promise<UploadAssetDTO | never> => {
    // step 3: stream the temp-disk file to S3 using multipart upload
    const Key = await this._AWS_S3.UploadLargeFiles({
      file: file,
      path: s3PathKeyPrefix({
        AssetType: AwsEnum.AssetType.Cover,    // marks this as a cover image
        file: file,
        folder: AwsEnum.FolderType.User,
        id: user.id,
      }) as string,
      ContentType: file.mimetype as string,     // MIME type forwarded to S3 object metadata
      StorageAprotche: StorageAprotches.Disk,   // tells the uploader to read from file.path
    });

    // guard: if no Key came back the multipart upload silently failed
    if (!Key) {
      throw new BadRequstExption("error while uploading assets to aws s3!");
    }

    // step 4: append the Key to the user's CoverImage array in DB
    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id },
      update: { $push: { CoverImage: Key } }, // $push appends without overwriting other keys
    });

    // rollback: remove the S3 object if the DB push failed (avoid orphaned assets)
    if (!result) {
      if (Key) {
        await this._AWS_S3.DeleteAsset({ Key });
      }
      throw new BadRequstExption("Error while Updating User CoverImage!");
    }

    return { result, Key };
  };

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * AddMultiFiles
   * Takes  : { user, files } — AssetsPayloadDTO
   *   • user  : authenticated user document
   *   • files : array of multer Files from memory storage (each has .buffer)
   * Does   :
   *   1. Uploads all files in a single S3 batch under "User/<id>/Images/" path
   *   2. Pushes all returned Keys into the user's CoverImage array in DB
   *   3. Rolls back by deleting all S3 objects if the DB update fails
   * Returns: UploadAssetsDTO → { Keys: string[], result: UpdateWriteOpResult }
   */
  public AddMultiFiles = async ({
    user,
    files,
  }: AssetsPayloadDTO): Promise<UploadAssetsDTO> => {
    // batch-upload all files to S3; returns an array of S3 object Keys
    const Keys = await this._AWS_S3.UploadMultiFiles({
      files,
      AssetType: AwsEnum.AssetType.Images, // sub-folder within the user's S3 space
      folder: AwsEnum.FolderType.User,
      id: user.id,
    });

    // guard: if no Keys returned the S3 batch upload failed
    if (!Keys) {
      throw new BadRequstExption("there is not Keys form s3");
    }

    // push all Keys into the user's CoverImage array in a single DB write
    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id },
      update: { $push: { CoverImage: Keys } }, // pushes an array of Keys at once
    });

    // rollback: bulk-delete from S3 if the DB update failed
    if (!result) {
      if (Keys) {
        await this._AWS_S3.DeleteAssets({ Keys });
      }
      throw new BadRequstExption("Error while adding Keys form s3 to user");
    }

    return { result, Keys };
  };

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * PresignedURL
   * Takes  : { user, ContentType, Originalname } — AssetsPayloadPresignedUrlDTO
   *   • user         : authenticated user (provides id for S3 path + DB update)
   *   • ContentType  : MIME type the client will use when PUTting the file to S3
   *   • Originalname : filename used to construct the S3 object key
   * Does   :
   *   STEP 3 → asks S3 to generate a time-limited pre-signed PUT URL + object Key
   *   STEP 4 → reserves the Key in the user's CoverImage array in DB so the asset
   *            is linked even before the client performs the actual upload
   *   STEP 5 → returns { payload: { Key, link }, result } to the controller
   * Returns: PresignedUrlDTO → { payload: { Key, link }, result: UpdateWriteOpResult }
   *
   * NOTE: The client MUST PUT the file binary directly to the returned `link`.
   */
  public PresignedURL = async ({
    user,
    ContentType,
    Originalname,
  }: AssetsPayloadPresignedUrlDTO): Promise<PresignedUrlDTO> => {
    /**
     * Generates a temporary Presigned URL for direct client-to-S3 uploads.
     *
     * WORKFLOW STEPS:
     * 1. Extract authenticated user context from token/session.
     * 2. Receive file metadata (`ContentType`, `Originalname`) from request body.
     * 3. Request S3 service to generate a signed PUT URL for the designated path.
     * 4. Record/reserve the S3 object Key in the user database record.
     * 5. Respond to client with `{ link, Key }` so client can PUT raw file to S3.
     */

    // STEP 2: file metadata (ContentType, Originalname) arrives from the controller — no binary here

    // STEP 3: call the S3 service to build a signed PUT URL and derive the final object Key
    const payload = await this._AWS_S3.Upload_PresignedURL({
      AssetType: "Profile",                  // used in path construction
      ContentType,                           // forwarded to S3 so the signed URL is type-restricted
      Originalname,                          // used to form the S3 key filename segment
      folder: AwsEnum.FolderType.User,
      id: user.id,
    });

    // STEP 4: persist the Key into the DB now so the record is created even before the upload
    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id },
      update: { $push: { CoverImage: payload.Key } }, // reserve the key slot in the array
    });

    // guard: if no document was modified the user filter didn't match or the push was rejected
    if (!result.modifiedCount) {
      throw new BadRequstExption(
        "error while Updating User , there is was not any update happend ",
      );
    }

    // STEP 5: return both the presigned-URL payload and the DB result to the controller
    return { payload, result };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ─────────────────── Retrieve & Download Assets ───────────────────────────
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * getUserAsset
   * Takes  : { Key } — the exact S3 object key string (e.g. "User/abc/Profile/photo.jpg")
   * Does   : fetches the S3 object using GetObjectCommand; the returned Body is a
   *          ReadableStream (NOT a buffer) — it is streamed straight to the HTTP response
   *          by the controller using Node's pipeline()
   * Returns: getUserAssetDTO → { Body: unknown (ReadableStream), ContentType: string | undefined }
   */
  public getUserAsset = async ({
    Key,
  }: {
    Key: string;
  }): Promise<getUserAssetDTO> => {
    // fetch the object from S3; Body is a streaming ReadableStream
    const { Body, ContentType } = await this._AWS_S3.RetrieveAsset({ Key });
    // ──────────────────────────────────────────────────────────────────────
    // return the raw stream and MIME type — the controller pipes Body into res
    return { Body, ContentType };
  };

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieve_PresignedURL
   * Takes  : Retrieve_PresignedURLDTO & { path: string[], Key: string }
   *   • Key         : full S3 object key (joined path segments)
   *   • path        : raw array of path segments (used to derive fallback filename)
   *   • filename    : optional custom name for the Content-Disposition header in the signed URL
   *   • download    : "true" | "false" — controls Content-Disposition inline vs attachment
   *   • ContentType : optional MIME type override; if undefined S3 forces download regardless of `download`
   * Does   : delegates to S3 service to generate a time-limited pre-signed GET URL
   * Returns: { Link: string } — the signed GET URL (ready to share/embed)
   *
   * NOTE: ContentType is optional — if omitted, S3 defaults to download behavior
   *       even when download="false" is passed.
   */
  public Retrieve_PresignedURL = async ({
    filename,
    download,
    ContentType,
    path,
    Key,
  }: Retrieve_PresignedURLDTO & { path: string[]; Key: string }): Promise<{
    Link: string;
  }> => {
    // debug: log query values to help trace issues in signed-URL generation
    console.log(filename, download, ContentType);
    // note: ContentType is optional becz if its = undefined that will mean download it anyway even if download= false,

    // delegate all signing logic to the S3 service layer
    const Link = await this._AWS_S3.Retrieve_PresignedURL({
      Key,         // exact S3 object key
      path,        // segment array for fallback filename derivation
      filename,    // explicit filename for Content-Disposition
      download,    // "true" → attachment, else inline
      ContentType, // MIME type embedded in the signed URL headers
    });

    // return the Link to the controller which validates it and sends the response
    return { Link };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ──────────────────────────── Delete Assets ───────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * DeleteUserAsset
   * Takes  : Delete_AssetPayloadDTO → { user: HUserDocument, Key: string }
   *   • user : authenticated user (needed to update their CoverImage array in DB)
   *   • Key  : the exact S3 object key string to delete
   * Does   :
   *   1. Deletes the object from S3; returns a DeleteMarker boolean
   *   2. If deletion failed (no DeleteMarker), throws a 400 error
   *   3. Pulls the Key from the user's CoverImage array in DB
   * Returns: DeleteAssetDTO → { DeleteMark: Boolean, result: UpdateWriteOpResult }
   */
  public DeleteUserAsset = async ({
    user,
    Key,
  }: Delete_AssetPayloadDTO): Promise<DeleteAssetDTO> => {
    // step 1: attempt to delete the single object from S3 bucket
    const DeleteMark = await this._AWS_S3.DeleteAsset({ Key });

    // guard: AWS S3 returns a DeleteMarker on versioned buckets; falsy means it failed
    if (!DeleteMark) {
      throw new BadRequstExption(
        "Error while Deleting Asset From AWS S3 User Bucket",
      );
    }

    // step 3: remove the Key from the user's CoverImage array in MongoDB
    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id },
      update: { $pull: { CoverImage: Key } }, // $pull removes the exact matching string from the array
    });

    // return deletion confirmation and DB update result to the controller
    return { result, DeleteMark };
  };

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * DeleteUserAssets
   * Takes  : Delete_AssetsPayloadDTO → { user: HUserDocument, Keys: string[] }
   *   • user : authenticated user (for DB update)
   *   • Keys : array of S3 object key strings to bulk-delete
   * Does   :
   *   1. Validates that Keys is a real array (Zod guards upstream but double-checks here)
   *   2. Calls S3 DeleteObjects (batch); S3service internally converts string[] → [{Key}[]] format
   *   3. Iterates over the S3 result and throws if any individual key failed to delete
   *   4. Removes all Keys from the user's CoverImage array in DB using $pull + $in
   * Returns: DeleteAssetsDTO → { result: UpdateWriteOpResult, Deleted: DeletedObject[] }
   */
  public DeleteUserAssets = async ({
    user,
    Keys,
  }: Delete_AssetsPayloadDTO): Promise<DeleteAssetsDTO> => {
    // guard: Zod already validates this, but double-check at runtime as a safety net
    if (!Array.isArray(Keys)) {
      log(Keys); // debug: log the unexpected value before throwing
      throw new BadRequstExption(`Keys must be an Array : received ${Keys}`);
    }

    // NOTE: the old approach of mapping to [{ Key: k }] is now handled inside S3service.DeleteAssets
    // const ArrayOfKeys: { Key: string }[] = Keys.map((k) => {
    //   return { Key: k };
    // });

    console.log("delete asstes key :", Keys); // debug: confirm Keys that will be deleted

    // now DeleteAssets \ DeleteAsset take string[] instead of { Key: string }[]
    // step 2: batch-delete from S3; S3service converts Keys → [{ Key }] internally
    const Deleted: DeletedObject[] = await this._AWS_S3.DeleteAssets({
      Keys, // plain string[] — S3service handles the AWS SDK format conversion
    });

    console.log({ Deleted }); // debug: inspect per-object deletion results from S3

    // step 3: verify every object was successfully deleted (S3 batch delete is "best effort")
    Deleted.map((d) => {
      if (!d.DeleteMarker) {
        throw new BadRequstExption(
          `Error while Deleting Asset From AWS S3 User Bucket , Key that cause Error : ${d.Key} `,
        );
      }
    });

    // step 4: remove all deleted Keys from the user's CoverImage array in one DB write
    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id },
      update: { $pull: { CoverImage: { $in: Keys } } }, // $in removes any element that matches one of the Keys
    });

    // return the DB result and the S3 deletion details to the controller
    return { result, Deleted };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ─────────────────────────── Notifications ────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * AssignFcmToken
   * Takes  : FCM_TokenPayloadDTO & { user: HUserDocument }
   *   • token : the Firebase Cloud Messaging device token string
   *   • user  : authenticated user document (provides id + existing FCM_Token array)
   * Does   :
   *   1. Checks for duplicate — throws 409 if token already exists in user.FCM_Token
   *   2. Pushes the token into the user's FCM_Token array in DB
   *   3. Guards against failed DB write
   * Returns: FCM_TokenDTO → { token: string, result: UpdateWriteOpResult }
   */
  public AssignFcmToken = async ({
    user,
    token,
  }: FCM_TokenPayloadDTO & { user: HUserDocument }): Promise<FCM_TokenDTO> => {
    // destructure id and current FCM_Token array from the user document
    const { id, FCM_Token } = user;

    // step 1: prevent duplicate tokens — each device should appear only once
    if (FCM_Token?.includes(token)) {
      throw new ConflictExption("token already assigned !");
    }

    // step 2: atomically append the new token to the user's FCM_Token array
    const result = await this._UserRepository.updateOne({
      filter: { _id: id }, // query by _id (never virtual id — see GEMINI.md)
      update: { $push: { FCM_Token: token } }, // $push appends without replacing
    });

    // guard: if no result came back the DB write silently failed
    if (!result) throw new BadRequstExption("Error while pushing token");

    // return the assigned token and the DB write result
    return { token, result };
  };

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * SendNotification
   * Takes  : SendNotificationPayloadDTO → { user: HUserDocument, data: { title, body } }
   *   • user : authenticated user (provides their FCM_Token array)
   *   • data : notification payload — { title: string, body: string }
   * Does   :
   *   1. Reads the user's FCM_Token array; throws 400 if empty (no registered devices)
   *   2. Validates that both tokens and data are present
   *   3. If multiple tokens → calls SendNotifications (batch multicast)
   *      If single token  → calls SendNotification (unicast)
   * Returns: Promise<string | void> — Firebase messaging response string or void
   * Throws : BadRequstExption if no tokens found, data missing, or FCM send fails
   */
  public SendNotification = async ({
    user,
    data,
  }: SendNotificationPayloadDTO): Promise<string | void> => {
    // step 1: read the FCM token list from the user document (default to empty array if undefined)
    const FCM_Token: string[] = user.FCM_Token || [];

    // guard: user must have at least one registered FCM token to receive notifications
    if (FCM_Token.length == 0)
      throw new BadRequstExption(
        "User dose not have FCM Token : user notification token not found",
      );
    // =================================================================

    // =================================================================
    // step 2: double-check both tokens and data exist before attempting to send
    if (!FCM_Token || !data) {
      throw new BadRequstExption("FCM_Token or data is undefined");
    }
    // =================================================================

    try {
      // step 3a: more than one token → use batch multicast for efficiency
      if (FCM_Token.length > 1) {
        return await this._NotificationService.SendNotifications({
          fcm_tokens: FCM_Token, // array of all registered device tokens
          data,                  // { title, body } notification payload
        });
      }
      // step 3b: exactly one token → use single unicast send
      else if (FCM_Token[0]) {
        return await this._NotificationService.SendNotification({
          fcm_token: FCM_Token[0]!, // non-null assertion (guarded by the if)
          data,
        });
      }
    } catch (err) {
      // wrap any FCM SDK error in a 400 with the original cause attached
      throw new BadRequstExption("error while sending notification", err);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────
}

// Export a singleton instance so all routes share the same service object
export default new UserService();
/*  */
