import { loginschema } from "./auth.validation";
import { NextFunction, Request, Response } from "express";
import {
  BadRequstExption,
  ConflictExption,
  SuccessResponse,
} from "../../Utils";
import { I_AuthLoginDTO } from "./auth.dto";

class AuthService {
  constructor() {}

  Login = (req: Request, res: Response, next: NextFunction): Response => {
    // throw new ConflictExption("error message", { cause: "lol" });
    return SuccessResponse({ res, message: "good" });
  };
}

export default new AuthService();
