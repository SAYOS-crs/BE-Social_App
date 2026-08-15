import { Request, Response } from "express";
import UserRepository from "../../DB/Repository/User.Repository";
import {
  AWS_SERVICE,
  BadRequstExption,
  NotificationService,
  SuccessResponse,
} from "../../Utils";

class UserService {
  private _NotificationService = NotificationService;
  private _UserRepository = new UserRepository();
  constructor() {}

  public GetUserProfile = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const user = req.user;
    return SuccessResponse<any>({ res, message: "good", data: user });
  };

  public AddUserPhoto = async (req: Request, res: Response) => {
    const result = await AWS_SERVICE.S3service.UploadFile({
      file: req.file as Express.Multer.File,
      path: "User",
      _id: req.user.id,
    });
    return SuccessResponse({ res, message: "done", data: result });
  };

  public GetFCM_Token = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    const { token } = req.body;
    const { id } = req.user;
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
    const { FCM_Token } = req.user;
    // ===============================================================
    const { data }: { data: { title: string; body: string } } = req.body;
    // ===============================================================
    if (!FCM_Token || !data) {
      throw new BadRequstExption("FCM_Token or data is undefined");
    }
    // ===============================================================

    try {
      if (Array.isArray(FCM_Token)) {
        const result = await this._NotificationService.SendNotifications({
          fcm_tokens: FCM_Token,
          data,
        });
        return SuccessResponse<any>({
          res,
          message: "notifications send successfly",
          data: result,
        });
      } else if (FCM_Token.length > 0) {
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
