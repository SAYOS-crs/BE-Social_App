import { log } from "console";
import { Request, Response } from "express";
import UserRepository from "../../DB/Repository/User.Repository";
import { HUserDocument } from "../../DB/models/User.model";
import {
  BadRequstExption,
  ConflictExption,
  HashingService,
  ITokenPair,
  JWTService,
  NotFoundExption,
  OtpService,
  SuccessResponse,
} from "../../Utils";
import { EmailType } from "../../Utils/Email/Email.templet";
import { I_AuthLoginDTO, I_AuthSignUpDTO } from "./auth.dto";

class AuthService {
  private _UserRepository = new UserRepository();
  constructor() {}

  SignUp = async ({
    payloude,
  }: {
    payloude: I_AuthSignUpDTO;
  }): Promise<HUserDocument> => {
    const {
      Email,
      Gender,
      Password,
      address,
      phone,
      username,
    }: I_AuthSignUpDTO = payloude;
    // checking if use exists
    const isUserExist = await this._UserRepository.exists({
      Email,
    });
    if (isUserExist) {
      throw new ConflictExption("Email already Exist");
    }
    // -------------------------------------
    // insert User
    const result = await this._UserRepository.Create({
      data: {
        Email,
        Gender,
        Password,
        address,
        phone,
        username,
      },
    });
    log("SignUp result :", result);
    // safety check
    if (!result)
      // tip : in next project make ErrorType witch return {status : error , cause : ...}
      // cuze the service must return data | error to use it in multi excution context like resful api or graphql , to handel the error form controller or the resolver for batter error handling
      throw new BadRequstExption(
        "something Went Wrong when trying to insert the User",
        { cause: result },
      );
    return result as HUserDocument;
  };

  Login = async ({
    payloude,
  }: {
    payloude: I_AuthLoginDTO;
  }): Promise<ITokenPair> => {
    const { Email, Password }: I_AuthLoginDTO = payloude;
    // ----------------------------------------------------------------------

    const user: HUserDocument | null = await this._UserRepository.findOne({
      filter: { Email },
    });

    if (!user) throw new NotFoundExption("User not found");
    if (!(await HashingService.Compare(Password, user.Password)))
      throw new BadRequstExption("Invalid Password");
    // ----------------------------------------------------------------------
    const Credentials: ITokenPair = await JWTService.CredentialsGenerator(user);
    return Credentials;
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
