// ─── Express core types ───────────────────────────────────────────────────────
import { Request, Response, Router } from "express";
// Node built-ins
import { log } from "node:console";        // lightweight console.log alias
import { pipeline } from "node:stream";    // stream-pipe utility (callback-based)
import { promisify } from "node:util";     // converts callback APIs → Promise-based
// ─── App config ───────────────────────────────────────────────────────────────
import { S3_SignedUrl_TTL } from "../../Config/config"; // TTL constant used in success messages
// ─── DB type ─────────────────────────────────────────────────────────────────
import { HUserDocument } from "../../DB/models/User.model"; // Hydrated Mongoose user doc type
// ─── Middlewares ──────────────────────────────────────────────────────────────
import {
  Authentication,   // verifies JWT and attaches user to req.user
  Authorization,    // checks if req.user has one of the allowed roles
  CloudFileUpload,  // multer wrapper → returns a configured multer instance
} from "../../Middlewares";
import Validation from "../../Middlewares/Validation.middleware"; // Zod schema validator middleware
// ─── Utilities ────────────────────────────────────────────────────────────────
import {
  AllowedFileTypes,  // object containing mime-type allow-lists per category
  AwsEnum,           // AWS-specific enums (download flags, asset types, etc.)
  BadRequstExption,  // 400-level error factory
  FileFilter,        // magic-number file-type guard middleware
  Guard,             // request guard helpers (authenticated user, files, S3 key)
  NotFoundExption,   // 404-level error factory
  Rolle,             // role enum (User, Admin, …)
  StorageAprotches,  // enum: Memory | Disk storage strategies for multer
  SuccessResponse,   // unified success response formatter
  TokenType,         // enum: Access | Refresh token type selector
} from "../../Utils";
// ─── Response/Payload DTOs ────────────────────────────────────────────────────
import {
  AssetsPayloadPresignedUrlDTO, // input shape for presigned-URL generation
  DeleteAssetDTO,               // output shape for single-asset deletion
  DeleteAssetsDTO,              // output shape for bulk-asset deletion
  DeleteUserProfileDTO,         // output shape for full user-profile deletion
  FCM_TokenDTO,                 // output shape for FCM token assignment
  PresignedUrlDTO,              // output shape for presigned-URL generation
  Retrieve_PresignedURLDTO,     // input shape (query params) for presigned-URL retrieval
  UploadAssetDTO,               // output shape for single-file upload
  UploadAssetsDTO,              // output shape for multi-file upload
} from "./user.dto";
import UserService from "./user.service"; // singleton service layer for all user business logic
// ─── Zod validation schemas ───────────────────────────────────────────────────
import {
  AddMultiFilesSchema,          // validates req.body when uploading multiple files
  addUserLargeFileSchema,       // validates req.body when uploading one large file (disk storage)
  addUserPhotoSchema,           // validates req.body when uploading a single photo (memory storage)
  AssignFcmTokenSchema,         // validates req.body: { token: string }
  DeleteUserAssetSchema,        // validates req.body: { Key: string }
  DeleteUserAssetsSchema,       // validates req.body: { Keys: string[] }
  getUserAssetSchema,           // validates req.params.path & req.query (filename, download)
  PresignedURLSchema,           // validates req.body: { ContentType, Originalname }
  RetrievePresignedURLSchema,   // validates req.params.path & req.query (filename, download, ContentType)
  SendNotificationSchema,       // validates req.body: { title, body }
} from "./user.validation";

// ─── Router instance ──────────────────────────────────────────────────────────
// All routes defined here are mounted under /user (set in the app entry file)
const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// GET /user/profile
// Auth : Access token required, Role: User
// Takes : nothing (user is derived from the JWT attached by Authentication middleware)
// Does  : extracts the authenticated user document and returns it directly
// Returns: SuccessResponse<HUserDocument>
// ──────────────────────────────────────────────────────────────────────────────
// -----------< tested Successfly >------------\\
router.get(
  "/profile",
  Authentication(TokenType.Access),  // middleware: decodes JWT, attaches user to req.user
  Authorization([Rolle.User]),        // middleware: ensures req.user has the User role
  (req: Request, res: Response): Response => {
    // extract the already-validated & attached user document from the request
    const user = Guard.GetAuthenticatedUser(req);
    // send it back wrapped in the standard success envelope
    return SuccessResponse<HUserDocument>({ res, message: "done", data: user });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /user/addUserPhoto
// Auth  : Access token required, Role: User
// Takes : multipart/form-data field "photo" (single image, max 5 MB, memory storage)
// Does  : uploads the photo to S3 and saves the returned Key in the user document
// Returns: SuccessResponse<UploadAssetDTO> → { Key: string, result: UpdateWriteOpResult }
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  "/addUserPhoto",
  Authentication(TokenType.Access),  // verify JWT, attach user
  Authorization([Rolle.User]),        // ensure User role
  CloudFileUpload({
    StorageAprotch: StorageAprotches.Memory, // keep file in memory buffer (no temp file on disk)
    maxSize: 5,                              // max file size in MB
  }).single("photo"),                        // accept a single file under the "photo" field name
  FileFilter(AllowedFileTypes.photo),        // reject non-image files via magic-number inspection
  Validation(addUserPhotoSchema),            // Zod-validate the multer file attached to req.body.file
  async (req: Request, res: Response): Promise<Response> => {
    // get authenticated user document from req.user
    const user = Guard.GetAuthenticatedUser(req);
    // get the validated single file from req.file (throws 400 if missing)
    const file = Guard.GetAuthorizedFile(req);
    // upload the file to S3 and update UserImage field in DB; returns { Key, result }
    const result = await UserService.AddUserPhoto({ user, file });
    // send unified success response with the upload result
    return SuccessResponse<UploadAssetDTO>({
      res,
      message: "User Photo has been Uploaded Successfly",
      data: result,
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// PUT /user/addUserLargeFile
// Auth  : Access token required, Role: User
// Takes : multipart/form-data field "LargeFile" (single file, disk/stream storage)
// Does  : streams the file to S3 via multipart upload (suitable for large files)
//         then pushes the returned Key into the user's CoverImage array in DB
// Returns: SuccessResponse<UploadAssetDTO> → { Key: string, result: UpdateWriteOpResult }
// ──────────────────────────────────────────────────────────────────────────────
router.put(
  "/addUserLargeFile",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  CloudFileUpload({ StorageAprotch: StorageAprotches.Disk }).single( // store temporarily on disk before streaming to S3
    "LargeFile", // multer field name for this upload
  ),
  FileFilter(AllowedFileTypes.photo),    // magic-number validation (reads from disk path)
  Validation(addUserLargeFileSchema),    // Zod-validate file metadata in req.body.file
  async (req: Request, res: Response): Promise<Response> => {
    // extract authenticated user
    const user = Guard.GetAuthenticatedUser(req);
    // extract the uploaded file (temp disk path included)
    const file = Guard.GetAuthorizedFile(req);
    // stream file to S3 via multipart upload; push Key to user.CoverImage in DB
    const result = await UserService.AddUserLargeFile({ file, user });
    return SuccessResponse<UploadAssetDTO>({
      res,
      message: "Large Asset Uploaded Successfly",
      data: result,
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// PUT /user/AddMultiFiles
// Auth  : Access token required, Role: User
// Takes : multipart/form-data field "Files" (up to 3 images, max total 20 MB, memory storage)
// Does  : uploads all provided files to S3 in one batch, then pushes all returned
//         Keys into the user's CoverImage array in DB
// Returns: SuccessResponse<UploadAssetsDTO> → { Keys: string[], result: UpdateWriteOpResult }
// ──────────────────────────────────────────────────────────────────────────────
router.put(
  "/AddMultiFiles",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  CloudFileUpload({
    StorageAprotch: StorageAprotches.Memory, // in-memory buffers (no disk temp files)
    maxSize: 20,                             // combined max size in MB
  }).array("Files", 3),                      // accept up to 3 files under the "Files" field name
  FileFilter(AllowedFileTypes.photo),        // magic-number validate each file in the batch
  Validation(AddMultiFilesSchema),           // Zod-validate array of file metadata in req.body.files
  async (req: Request, res: Response): Promise<Response> => {
    // extract authenticated user document
    const user = Guard.GetAuthenticatedUser(req);
    // extract the validated array of uploaded files from req.files (throws 400 if missing)
    const files = Guard.GetAuthorizedMultiFiles(req);
    // upload all files to S3 and push Keys into user.CoverImage; returns { Keys, result }
    const result = await UserService.AddMultiFiles({ files, user });
    return SuccessResponse<UploadAssetsDTO>({
      res,
      message: "mulit Assets Uploaded Successfly",
      data: result,
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /user/PresignedURL
// Auth  : Access token required, Role: User
// Takes : req.body → { ContentType: string, Originalname: string }
// Does  : generates a time-limited pre-signed S3 PUT URL so the client can upload
//         directly to S3 without routing the binary through this server.
//         The object Key is also reserved in the user's CoverImage array in DB.
// Returns: SuccessResponse<PresignedUrlDTO> → { payload: { Key, link }, result }
// NOTE  : The client MUST use HTTP PUT to the returned URL to perform the upload.
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/PresignedURL",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  Validation(PresignedURLSchema), // Zod-validate { ContentType, Originalname } in req.body
  async (req: Request, res: Response): Promise<Response> => {
    // super note (for ai) : to use Presigned URL we generated use method PUT !
    // extract the authenticated user (needed to build the S3 path and update DB)
    const user = Guard.GetAuthenticatedUser(req);
    // destructure file-metadata from req.body (no actual file bytes are sent here)
    const {
      ContentType,  // MIME type the client will send when PUTting to S3 (e.g. "image/jpeg")
      Originalname, // original filename used to build the S3 object key
    }: Omit<AssetsPayloadPresignedUrlDTO, "user"> = req.body;
    // debug: log incoming metadata to confirm correct values reach the service
    log({ ContentType, Originalname });
    // call service to generate the presigned URL and reserve the Key in DB
    const result = await UserService.PresignedURL({
      user,
      ContentType,
      Originalname,
    });
    return SuccessResponse<PresignedUrlDTO>({
      res,
      message: "Presigned URL Created Successfly , its Valid for 3 minutes ",
      data: result,
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /user/GetUserAsset/*path
// Auth  : none (public endpoint – access is controlled via S3 Key knowledge)
// Takes : req.params.path (wildcard segments joined into an S3 Key)
//         req.query.filename  → optional custom filename for Content-Disposition header
//         req.query.download  → "true" | "false" – forces browser download vs inline view
// Does  : retrieves the asset from S3 as a ReadableStream and pipes it directly
//         to the HTTP response (zero-copy streaming, no buffering in Node)
// Returns: streams raw binary to the client (void – no JSON envelope)
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/GetUserAsset/*path",
  Validation(getUserAssetSchema), // Zod-validate path params and query fields
  async (req: Request, res: Response): Promise<void> => {
    // 1. Reconstruct the full S3 object Key from the wildcard path segments
    //    (Express splits "folder/sub/file.jpg" into an array; we join with "/")
    const { path, Key } = Guard.S3_RetrieveKeyFromParams(req);

    // pull optional query params that control response headers
    const { filename, download } = req.query;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Fetch the asset from S3; Body is a Readable stream, ContentType is the MIME string
    const { Body, ContentType } = await UserService.getUserAsset({ Key });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Set CORS header so browsers in other origins can load the asset (e.g. <img> tags)
    res.set("Cross-Origin-Resource-Policy", "cross-origin");

    // If the client requests a forced download, set the appropriate response headers
    // NOTE: Content-Disposition "attachment" only triggers a download in browsers.
    //       API clients (Postman, Insomnia, etc.) ignore this header.
    if (download === AwsEnum.download.True) {
      log("file downloading ...");
      // tell the browser to download with the given (or derived) filename
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename || path[path.length - 1]}"`, // fall back to the last path segment as filename
      );
      // set the MIME type so the browser knows how to handle the downloaded file
      res.setHeader("Content-Type", ContentType || "application/octet-stream"); // fallback to generic binary if MIME unknown
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Pipe the S3 ReadableStream directly into the Express Response stream.
    //    pipeline() handles back-pressure and automatically closes both streams on finish/error.
    //    promisify() converts the callback-based pipeline() into a Promise so errors surface correctly.
    const S3_ReadStream = promisify(pipeline);
    S3_ReadStream(Body as NodeJS.ReadableStream, res); // streams data chunk-by-chunk → no full buffer in memory
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /user/RetrievePresignedURL/*path
// Auth  : none (the signed URL itself carries expiry & auth)
// Takes : req.params.path (wildcard S3 Key segments)
//         req.query.filename    → optional custom download filename
//         req.query.download    → "true" | "false" (controls Content-Disposition in the signed URL)
//         req.query.ContentType → optional MIME type override; if undefined the URL forces download
// Does  : generates a time-limited pre-signed GET URL pointing directly at the S3 object.
//         The client can share or embed this URL without any further authentication.
// Returns: SuccessResponse<string> → the signed URL string
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/RetrievePresignedURL/*path",
  Validation(RetrievePresignedURLSchema), // Zod-validate path and query params
  async (req: Request, res: Response): Promise<Response> => {
    // reconstruct the full S3 Key from the wildcard route segments
    const { Key, path } = Guard.S3_RetrieveKeyFromParams(req);

    // note: ContentType is optional – if undefined the presigned URL will force a download
    //       regardless of the `download` flag, because S3 defaults to binary disposition
    const { ContentType, download, filename }: Retrieve_PresignedURLDTO =
      req.query; // all query params typed via Zod-inferred DTO

    // call service to build the pre-signed GET URL via the AWS SDK
    const { Link } = await UserService.Retrieve_PresignedURL({
      Key,       // S3 object key (e.g. "User/abc123/Profile/photo.jpg")
      path,      // raw array of path segments (used to derive fallback filename)
      ContentType, // optional MIME type to embed in the signed URL
      download,    // "true" → Content-Disposition: attachment | else inline
      filename,    // optional explicit filename for the Content-Disposition header
    });

    // guard: if the service could not generate a URL the asset likely doesn't exist
    if (!Link) {
      throw new NotFoundExption("Cant Generate link !, Asset not found");
    }

    return SuccessResponse<string>({
      res,
      message: `retrieve link Generated , TTL:${S3_SignedUrl_TTL}`, // inform client of the URL lifetime
      data: Link, // the complete pre-signed S3 GET URL
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// POST /user/AssignFcmToken
// Auth  : Access token required, Role: User
// Takes : req.body → { token: string } — the Firebase Cloud Messaging device token
// Does  : pushes the FCM token into the user's FCM_Token array in DB (no duplicates)
// Returns: SuccessResponse<FCM_TokenDTO> → { token, result: UpdateWriteOpResult }
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/AssignFcmToken",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  Validation(AssignFcmTokenSchema), // Zod-validate { token: string } in req.body
  async (req: Request, res: Response): Promise<Response> => {
    // get the authenticated user to know which document to update
    const user = Guard.GetAuthenticatedUser(req);
    // extract the FCM device token from the validated request body
    const { token } = req.body;
    // call service: checks for duplicate, pushes token, returns { token, result }
    const result = await UserService.AssignFcmToken({ token, user });
    return SuccessResponse<FCM_TokenDTO>({
      res,
      message: "FCM Token Assigned Successfly",
      data: result,
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// POST /user/SendNotification
// Auth  : Access token required, Role: User
// Takes : req.body → { title: string, body: string } — notification content
// Does  : sends a Firebase push notification to all FCM tokens stored on the user.
//         Uses SendNotification (single) or SendNotifications (batch) based on token count.
// Returns: SuccessResponse<string | any> → Firebase messaging response
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  "/SendNotification",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  Validation(SendNotificationSchema), // Zod-validate { title: string (5-20), body: string (10-50) }
  async (req: Request, res: Response): Promise<Response> => {
    // get authenticated user (FCM_Token array is read from this document)
    const user = Guard.GetAuthenticatedUser(req);
    // full validated body; the service expects { title, body } shape
    const data = req.body;
    // delegate to service which picks single vs batch FCM send automatically
    const result = await UserService.SendNotification({ data, user });
    return SuccessResponse<string | any>({
      res,
      message: "Notification send Successfly",
      data: result, // Firebase messaging batch/single result or message ID
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /user/DeleteUserAsset
// Auth  : Access token required, Role: User | Admin
// Takes : req.body → { Key: string } — the exact S3 object key to remove
// Does  : deletes the asset from the S3 bucket and pulls the Key from the user's
//         CoverImage array in DB
// Returns: SuccessResponse<DeleteAssetDTO> → { DeleteMark: boolean, result }
//
// ⚠️  IMPORTANT — always destructure with explicit type from req.body:
//     const { Key }: { Key: string } = req.body
//     NOT: const key = req.body   ← this causes silent type-inference bugs
// ──────────────────────────────────────────────────────────────────────────────
router.delete(
  "/DeleteUserAsset",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  Validation(DeleteUserAssetSchema), // Zod-validate { Key: string } in req.body
  async (req: Request, res: Response): Promise<Response> => {
    // get authenticated user (needed to pull the Key from their CoverImage array)
    const user = Guard.GetAuthenticatedUser(req);
    // destructure with explicit type annotation to avoid Mongoose/TS inference bugs
    // (without the type annotation TypeScript infers `any`, which bypasses DTO checks)
    const { Key }: { Key: string } = req.body;
    // call service: deletes from S3 + DB; returns { DeleteMark, result }
    const { DeleteMark, result } = await UserService.DeleteUserAsset({
      Key,
      user,
    });
    // guard: if S3 deletion did not confirm, surface a clear error
    if (!DeleteMark) {
      throw new BadRequstExption("error while deleting Asset !");
    }
    return SuccessResponse<DeleteAssetDTO>({
      res,
      message: `User Asset Deleted Successfly , Deleted Asset Key : ${Key}`,
      data: { DeleteMark, result }, // confirm the deleted key and DB update result
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /user/DeleteUserAssets
// Auth  : Access token required, Role: User | Admin
// Takes : req.body → { Keys: string[] } — list of S3 object keys to remove in bulk
// Does  : batch-deletes all listed assets from S3 and removes them from the user's
//         CoverImage array in DB using $pull + $in
// Returns: SuccessResponse<DeleteAssetsDTO> → { result, Deleted: DeletedObject[] }
//
// ⚠️  Same destructuring rule as above: always type-annotate the destructured value.
// ──────────────────────────────────────────────────────────────────────────────
router.delete(
  "/DeleteUserAssets",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  Validation(DeleteUserAssetsSchema), // Zod-validate { Keys: string[] } in req.body
  async (req: Request, res: Response) => {
    // get authenticated user for the DB update step
    const user = Guard.GetAuthenticatedUser(req);
    // type-annotate the destructured array to prevent any[] inference
    const { Keys }: { Keys: string[] } = req.body;
    // batch delete from S3 + DB; returns { result, Deleted: DeletedObject[] }
    const result = await UserService.DeleteUserAssets({ Keys, user });
    return SuccessResponse<DeleteAssetsDTO>({
      res,
      message: "User Assets Deleted Successfly",
      data: result,
    });
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /user/H_DeleteUser   (H_ prefix = "Hard" delete)
// Auth  : Access token required, Role: User | Admin
// Takes : nothing extra — user identity is taken from the JWT
// Does  : permanently deletes the user document from MongoDB and removes all their
//         S3 assets (UserImage + CoverImage folder) via prefix-based bulk deletion
// Returns: SuccessResponse<DeleteUserProfileDTO> → { DeletedUser, DeletedAssets }
// ──────────────────────────────────────────────────────────────────────────────
router.delete(
  "/H_DeleteUser",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  async (req: Request, res: Response): Promise<Response> => {
    // get the user that requested their own deletion
    const user = Guard.GetAuthenticatedUser(req);
    // call service: deletes user doc from DB, then bulk-deletes their S3 folder
    const result = await UserService.DeleteUserProfile(user);
    // guard: if the DB deletion did not return a document, something went wrong
    if (!result.DeletedUser) {
      throw new BadRequstExption("error while deleting user profile");
    }
    return SuccessResponse<DeleteUserProfileDTO>({
      res,
      message: "User Profile Deleted Successfly",
      data: result, // { DeletedUser: HUserDocument, DeletedAssets: DeletedObject[] }
    });
  },
);

// ---------------------------------------
// -----------< test requierd >------------\\
//
//
// ---------------------------------------
// async (req:Request,res:Response)=>{},

export default router;
