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
    const data: I_AuthLoginDTO = req.body;
    const ValidationResult = loginschema.body.safeParse(data);

    if (!ValidationResult.success) {
      console.log(ValidationResult.error.issues);
      throw new BadRequstExption(
        "validation error",
        200,
        ValidationResult.error.issues,
      );
    } else {
      return SuccessResponse<I_AuthLoginDTO>({ res, message: "done", data });
    }
  };
}

export default new AuthService();
