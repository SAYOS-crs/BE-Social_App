import { NextFunction, Request, Response } from "express";
import {
  BadRequstExption,
  ConflictExption,
  SuccessResponse,
} from "../../Utils";
import UserRepository from "../../DB/Repository/User.Repository";
import { I_AuthSignUpDTO } from "./auth.dto";
import hashingService from "../../Utils/Security/hashing.service";
import EncryptionService, {
  CreateSecretKey,
} from "../../Utils/Security/Encryption.service";

class AuthService {
  private _UserRepository = new UserRepository();
  constructor() {}

  SignUp = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response> => {
    const {
      Email,
      Gender,
      Password,
      address,
      phone,
      username,
    }: I_AuthSignUpDTO = req.body;

    // checking if use exists
    const isUserExist = await this._UserRepository.exists({
      Email,
    });
    if (isUserExist) {
      throw new ConflictExption("Email already Exist");
    }
    // -------------------------------------
    // insert User
    const result = await this._UserRepository.insertOne({
      data: {
        Email,
        Gender,
        Password: await hashingService.Hash(Password),
        address,
        phone: await EncryptionService.Encrypt(phone),
        username,
      },
    });

    // safety check
    if (!result)
      throw new BadRequstExption(
        "something Went Wrong when trying to insert the User",
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
