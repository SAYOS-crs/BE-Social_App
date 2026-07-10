import { loginschema } from "./auth.validation";
import { NextFunction, Request, Response } from "express";
import {
  BadRequstExption,
  ConflictExption,
  SuccessResponse,
} from "../../Utils";
import { I_AuthLoginDTO } from "./auth.dto";
import UserModel from "../../DB/models/User.model";

class AuthService {
  constructor() {}

  Login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response> => {
    const data = req.body;
    const result = await UserModel.insertOne(data);
    // console.log(data);

    console.log(result);
    return SuccessResponse<any>({
      res,
      message: "good",
      data: result,
    });
  };
}

export default new AuthService();
