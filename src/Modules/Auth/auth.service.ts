import { NextFunction, Request, Response } from "express";
import {
  BadRequstExption,
  ConflictExption,
  HashingService,
  JWTService,
  NotFoundExption,
  OtpService,
  SuccessResponse,
} from "../../Utils";
import UserRepository from "../../DB/Repository/User.Repository";
import { I_AuthSignUpDTO } from "./auth.dto";
import hashingService from "../../Utils/Security/hashing.service";
import EncryptionService, {
  CreateSecretKey,
} from "../../Utils/Security/Encryption.service";
import { EmailType } from "../../Utils/Email/Email.templet";
import RedisService from "../../DB/RedisRepository";
import { HUserDocument, IUser } from "../../DB/models/User.model";

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

  Login = async (req: Request, res: Response): Promise<Response> => {
    const { Email, Password } = req.body;
    // ----------------------------------------------------------------------

    const user: HUserDocument | null = await this._UserRepository.findOne({
      filter: { Email },
    });

    if (!user) throw new NotFoundExption("User not found");
    if (!(await HashingService.Compare(Password, user.Password)))
      throw new BadRequstExption("Invalid Password");
    // ----------------------------------------------------------------------
    const Credentials = await JWTService.CredentialsGenerator(user);
    return SuccessResponse({
      res,
      message: "logged in successfully",
      data: Credentials,
    });
  };

  // -—-—-—-—-—-—-—-—-—-—-—-—<< Confirm Email Routers >>--—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—
  SendConfirmEmail = async (req: Request, res: Response): Promise<Response> => {
    // step1 > get the user email
    const { Email } = req.body;
    // step2 > send otp using email and emailtype for prefix
    await OtpService.SendOTP({ Email, EmailType: EmailType.ConfirmEmail });
    return SuccessResponse({ res, message: "check your Email" });
  };
  ConfirmEmail = async (req: Request, res: Response): Promise<Response> => {
    // step1 > get the  otp and email
    const { OTP, Email } = req.body;
    // ----------------------------------------------------------------------
    // step2 > get the hased otp form redis
    // step3 > compare the otp with the hashed one
    // -- step2 + step3 = VerifyOTP
    const otp_r = await OtpService.VerifyOTP(
      Email,
      OTP,
      EmailType.ConfirmEmail,
    );
    if (!otp_r) throw new BadRequstExption("Invalid OTP");
    // ----------------------------------------------------------------------
    // step4 > update user date
    const result =
      (await this._UserRepository.updateOne({
        filter: { Email: Email },
        update: { confirmEmail: new Date() },
      })) || "";

    if (!result)
      throw new ConflictExption("Error while updating user data ...");
    return SuccessResponse<any>({
      res,
      message: "Email Confirmed Successfly",
      data: result,
    });
  };
}

export default new AuthService();
