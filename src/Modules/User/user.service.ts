import { Request, Response } from "express";
import UserRepository from "../../DB/Repository/User.Repository";
import {
  AWS_SERVICE,
  BadRequstExption,
  NotificationService,
  s3PathKeyPrefix,
  SuccessResponse,
  UnAuthroizedExption,
} from "../../Utils";
import { HUserDocument } from "../../DB/models/User.model";
import mongoose, { Types } from "mongoose";

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

  public GetUserProfile = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const user = this._GetAuthenticatedUser(req);
    return SuccessResponse<any>({ res, message: "good", data: user });
  };

  public AddUserPhoto = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const user = this._GetAuthenticatedUser(req);
    const Key = await this._AWS_S3.UploadFile({
      file: req.file as Express.Multer.File,
      path: s3PathKeyPrefix({
        folder: "User",
        AssetType: "Profile",
        file: req.file as Express.Multer.File,
        id: user.id,
      }),
    });
    if (!Key)
      throw new BadRequstExption(
        "Error while Uploading Asset to AWS Service !",
      );

    const result = await this._UserRepository.updateOne({
      filter: { _id: user._id },
      update: { UserImage: Key },
    });
    if (!result) throw new BadRequstExption("error while setting user photo");
    return SuccessResponse({ res, message: "done", data: result });
  };

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
}

export default new UserService();
