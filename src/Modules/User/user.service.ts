import { Request, Response } from "express";
import UserRepository from "../../DB/Repository/User.Repository";
import { SuccessResponse } from "../../Utils";
import { IRequest } from "../../Middlewares/Authentication.middleware";

class UserService {
  private _UserRepository = new UserRepository();
  constructor() {}

  public GetUserProfile = async (
    req: IRequest,
    res: Response,
  ): Promise<Response> => {
    const user = req.user;
    return SuccessResponse<any>({ res, message: "good", data: user });
  };
}

export default new UserService();
