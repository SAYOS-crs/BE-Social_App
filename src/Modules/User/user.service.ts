import { Request, Response } from "express";
import UserRepository from "../../DB/Repository/User.Repository";
import {
  AWS_SERVICE,
  BadRequstExption,
  NotificationService,
  s3PathKeyPrefix,
  StorageAprotches,
  SuccessResponse,
  UnAuthroizedExption,
} from "../../Utils";
import { HUserDocument } from "../../DB/models/User.model";

// ------------------ tools ---------------\\
// - S3_ReadStream = transform pipeline from callback to async
import { promisify } from "node:util";
import { pipeline } from "node:stream";
import { DeletedObject } from "@aws-sdk/client-s3";
const S3_ReadStream = promisify(pipeline);
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// -
const S3_RetrieveKeyFromParams = (
  req: Request,
): { Key: string; path: string[] } => {
  const { path } = req.params as { path: string[] };
  const Key = path.join("/");
  return { Key, path };
};
// -----------------------------------------\\
export class UserService {
  private _NotificationService = NotificationService;
  private _UserRepository = new UserRepository();
  private readonly _AWS_S3 = AWS_SERVICE.S3service;
  constructor() {}

  private _GetAuthenticatedUser = (req: Request): HUserDocument => {
    if (!req.user) {
      throw new UnAuthroizedExption("User is not authenticated");
    }
    return req.user;
  };
  private _GetAuthorizedFile = (req: Request): Express.Multer.File => {
    if (!req.file) {
      throw new BadRequstExption("file not receved !");
    }

    return req.file;
  };
  private _GetAuthorizedMultiFiles = (req: Request): Express.Multer.File[] => {
    if (!req.files) {
      throw new BadRequstExption("file not receved !");
    }

    return req.files as Express.Multer.File[];
  };

  // ---------------------------------------- routers ----------------------------------------\\
  public GetUserProfile = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const user = this._GetAuthenticatedUser(req);
    return SuccessResponse<any>({ res, message: "good", data: user });
  };
  public DeleteUserProfile = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const user = this._GetAuthenticatedUser(req);

    const DeletedUser = await this._UserRepository.DeleteOne({ _id: user._id });
    let DeletedAssets;
    if (DeletedUser.CoverImage?.length || DeletedUser.UserImage) {
      DeletedAssets = await this._AWS_S3.DeleteAssetsByPrefix({
        folder: "User",
        id: user.id,
      });
    }
    console.log(DeletedAssets);

    return SuccessResponse({
      res,
      message: "User Deleted successfly",
      data: { DeletedUser, DeletedAssets },
    });
  };
  // ------------------------------------------------------------------------------------------------
  // ------------------------------------------------------------------------------------------------
  // ------------------------------------------------------------------------------------------------
  // ---------------------------------------- Upload Assets ----------------------------------------
  public AddUserPhoto = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const user = this._GetAuthenticatedUser(req);
    const file = this._GetAuthorizedFile(req);
    // -------------------------------------------------------
    const Key = await this._AWS_S3.UploadFile({
      file,
      path: s3PathKeyPrefix({
        AssetType: "Profile",
        file,
        folder: "User",
        id: user.id,
      }),
    });
    console.log(file.mimetype, file.originalname);

    if (!Key)
      throw new BadRequstExption(
        "Error while Uploading Asset to AWS Service !",
      );
    console.log(Key);
    // -------------------------------------------------------

    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id },
      update: { UserImage: Key },
    });

    if (!result) throw new BadRequstExption("error while setting user photo");
    return SuccessResponse({ res, message: "done", data: result });
  };
  // ------------------------------------------------------------------------------------------------
  public AddUserLargeFile = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    // 1. get the User
    const user = this._GetAuthenticatedUser(req);
    // 2. get the file
    const file = this._GetAuthorizedFile(req);
    // -------------------------------------------------------------
    // 3. send file by aws Service / UploadLargeFiles
    const Key = await this._AWS_S3.UploadLargeFiles({
      file: file,
      path: s3PathKeyPrefix({
        AssetType: "Cover",
        file: file,
        folder: "User",
        id: user.id,
      }) as string,
      ContentType: file.mimetype as string,
      StorageAprotche: StorageAprotches.Disk,
    });

    if (!Key) {
      throw new BadRequstExption("Key form aws is missing !");
    }

    // --------------------------------------------------------------
    // 4. send the Key form AWS to User CoverImage
    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id },
      update: { $push: { CoverImage: Key } },
    });

    if (!result) {
      throw new BadRequstExption("Error while Updating User CoverImage!");
    }

    return SuccessResponse<any>({ res, message: "done", data: result });
  };
  // ------------------------------------------------------------------------------------------------
  public AddMultiFiles = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const user = this._GetAuthenticatedUser(req);
    const files = this._GetAuthorizedMultiFiles(req);

    // call the s3
    const Keys = await this._AWS_S3.UploadMultiFiles({
      files,
      AssetType: "Images",
      folder: "User",
      id: user.id,
    });

    if (!Keys) {
      throw new BadRequstExption("there is not Keys form s3");
    }
    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id },
      update: { $push: { CoverImage: Keys } },
    });
    if (!result) {
      throw new BadRequstExption("Error while adding Keys form s3 to user");
    }

    return SuccessResponse<any>({ res, message: "done", data: result });
  };
  // ------------------------------------------------------------------------------------------------
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
  public PresignedURL = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    // STEP 1: Get the authenticated user ID
    const user = this._GetAuthenticatedUser(req);
    // STEP 2: Extract file metadata provided by client (no binary payload here)
    const { ContentType, Originalname } = req.body;

    // STEP 3: Generate the time-limited presigned S3 PUT URL and object Key
    const payload = await this._AWS_S3.Upload_PresignedURL({
      AssetType: "Profile",
      ContentType,
      Originalname,
      folder: "User",
      id: user.id,
    });

    // STEP 4: Store S3 Key in the database to link asset to the user profile
    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id },
      update: { $push: { CoverImage: payload.Key } },
    });

    // STEP 5: Send response containing `{ link, Key }` to client for direct upload
    return SuccessResponse<any>({ res, data: { payload, result } });
  };
  // ------------------------------------------------------------------------------------------------
  // ------------------------------------------------------------------------------------------------
  // ---------------------------------- Retrieve & Download Assets ----------------------------------\\
  public getUserAsset = async (req: Request, res: Response) => {
    const { filename, download } = req.query;
    // 1. get assets key form params : its come sapert apart so its must join them.
    const { path, Key } = S3_RetrieveKeyFromParams(req);
    // */*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/---------------------------
    // 2. get the assets by Key , and distruct the body , the body is stream data
    const { Body, ContentType } = await this._AWS_S3.RetrieveAsset({ Key });
    // */*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/---------------------------
    // 3. set the headers
    // - cors header
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    // - download header if true it will download the assets
    if (download === "true") {
      // - Content-type header
      res.setHeader("Content-Type", ContentType || "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename || path[path.length - 1]}"`,
      );
    }
    // */*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/---------------------------

    // 4. using S3_ReadStream method we created bass it the stream as ReadableStream and the distnation and will be Response and its automatic detect the res.pip and pass the stream when finish to it.
    S3_ReadStream(Body as NodeJS.ReadableStream, res);
    // return SuccessResponse({ res, message: "done", data: result });
  };
  // ------------------------------------------------------------------------------------------------
  public Retrieve_PresignedURL = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const { filename, download, ContentType } = req.query as {
      filename: string;
      download: string;
      ContentType: string;
    };
    console.log(filename, download, ContentType);
    // note : ContentType is optional becz if its = undefined that will mean download any way even if download= false,

    const { path, Key } = S3_RetrieveKeyFromParams(req);
    const Link = await this._AWS_S3.Retrieve_PresignedURL({
      Key,
      path,
      filename,
      download,
      ContentType,
    });
    return SuccessResponse<any>({ res, message: "done", data: { Link } });
  };
  // ------------------------------------------------------------------------------------------------
  // ------------------------------------------------------------------------------------------------
  // ------------------------------------- Delete Assets -------------------------------------------\\
  public Delete_Asset = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const user = this._GetAuthenticatedUser(req);
    const { Key } = req.body;
    const DeleteMark = await this._AWS_S3.DeleteAsset({ Key });
    console.log({ DeleteMark });
    if (!DeleteMark) {
      throw new BadRequstExption(
        "Error while Deleting Asset From AWS S3 User Bucket",
      );
    }
    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id },
      update: { $pull: { CoverImage: Key } },
    });

    return SuccessResponse({
      res,
      message: "done",
      data: { result, DeleteMark },
    });
  };
  // ------------------------------------------------------------------------------------------------
  public Delete_Assets = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const user = this._GetAuthenticatedUser(req);
    const { Keys } = req.body as { Keys: string[] };

    if (!Array.isArray(Keys)) {
      throw new BadRequstExption("Keys must be an Array");
    }

    const ArrayOfKeys: { Key: string }[] = Keys.map((k) => {
      return { Key: k };
    });
    console.log(ArrayOfKeys);

    const Deleted: DeletedObject[] = await this._AWS_S3.DeleteAssets({
      Keys: ArrayOfKeys,
    });
    console.log({ Deleted });
    Deleted.map((d) => {
      if (!d.DeleteMarker) {
        throw new BadRequstExption(
          `Error while Deleting Asset From AWS S3 User Bucket , Key that cause Error : ${d.Key} `,
        );
      }
    });

    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id },
      update: { $pull: { CoverImage: { $in: Keys } } },
    });

    return SuccessResponse({ res, message: "done", data: { result, Deleted } });
  };
  // ------------------------------------------------------------------------------------------------

  // ------------------------------------------------------------------------------------------------
  // ------------------------------------------------------------------------------------------------
  // ------------------------------------------------------------------------------------------------
  // ---------------------------------------- notifications -----------------------------------------\\
  public GetFCM_Token = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const user = this._GetAuthenticatedUser(req);
    const { token } = req.body;
    const { id } = user;
    const result = this._UserRepository.updateOne({
      filter: { _id: id },
      update: { $push: { FCM_Token: token } },
    });
    if (!result) throw new BadRequstExption("Error while pushing token");
    return SuccessResponse<any>({
      res,
      message: "done",
      data: { token, result },
    });
  };
  // ------------------------------------------------
  public sendNotification = async (
    req: Request,
    res: Response,
  ): Promise<Response | void> => {
    const user = this._GetAuthenticatedUser(req);
    const FCM_Token: string[] = user.FCM_Token || [];
    if (FCM_Token.length == 0)
      throw new BadRequstExption(
        "User dose not have FCM Token : user notification token not found",
      );
    // ===============================================================
    const { data }: { data: { title: string; body: string } } = req.body;
    // ===============================================================
    if (!FCM_Token || !data) {
      throw new BadRequstExption("FCM_Token or data is undefined");
    }
    // ===============================================================

    try {
      if (FCM_Token.length > 1) {
        const result = await this._NotificationService.SendNotifications({
          fcm_tokens: FCM_Token,
          data,
        });
        return SuccessResponse<any>({
          res,
          message: "notifications send successfly",
          data: result,
        });
      } else if (FCM_Token[0]) {
        const result = await this._NotificationService.SendNotification({
          fcm_token: FCM_Token[0]!,
          data,
        });

        return SuccessResponse<any>({
          res,
          message: "notification send successfly",
          data: result,
        });
      }
    } catch (err) {
      throw new BadRequstExption("error while sending notification", err);
    }
  };
  // ------------------------------------------------------------------------------------------------
  // ------------------------------------------------------------------------------------------------
  // ------------------------------------------------------------------------------------------------
}

export default new UserService();
/*  */
