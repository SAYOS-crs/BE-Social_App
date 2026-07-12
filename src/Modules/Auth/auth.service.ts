import { NextFunction, Request, Response } from "express";
import {
  BadRequstExption,
  ConflictExption,
  SuccessResponse,
} from "../../Utils";
import UserRepository from "../../DB/Repository/User.Repository";
import { I_AuthSignUpDTO } from "./auth.dto";

class AuthService {
  private _UserRepository = new UserRepository();
  constructor() {}

  SignUp = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response> => {
    const data: I_AuthSignUpDTO = req.body;
    // checking if use exists
    const isUserExist = await this._UserRepository.exists({
      Email: data.Email,
    });
    if (isUserExist) {
      throw new ConflictExption("Email already Exist");
    }
    // -------------------------------------
    // insert User
    const result = await this._UserRepository.insertOne({ data });
    // safety check
    if (!result)
      throw new BadRequstExption(
        "somthing Went Worng when trying to insert the User",
        { cause: result },
      );
    return SuccessResponse<any>({
      res,
      message: "good",
      data: result,
    });
  };
}

export default new AuthService();
