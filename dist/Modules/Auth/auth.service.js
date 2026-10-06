"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const console_1 = require("console");
const User_Repository_1 = __importDefault(require("../../DB/Repository/User.Repository"));
const Utils_1 = require("../../Utils");
const Email_templet_1 = require("../../Utils/Email/Email.templet");
class AuthService {
    _UserRepository = new User_Repository_1.default();
    constructor() { }
    SignUp = async ({ payloude, }) => {
        const { Email, Gender, Password, address, phone, username, } = payloude;
        // checking if use exists
        const isUserExist = await this._UserRepository.exists({
            Email,
        });
        if (isUserExist) {
            throw new Utils_1.ConflictExption("Email already Exist");
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
        (0, console_1.log)("SignUp result :", result);
        // safety check
        if (!result)
            // tip : in next project make ErrorType witch return {status : error , cause : ...}
            // cuze the service must return data | error to use it in multi excution context like resful api or graphql , to handel the error form controller or the resolver for batter error handling
            throw new Utils_1.BadRequstExption("something Went Wrong when trying to insert the User", { cause: result });
        return result;
    };
    Login = async (req, res) => {
        const { Email, Password } = req.body;
        // ----------------------------------------------------------------------
        const user = await this._UserRepository.findOne({
            filter: { Email },
        });
        if (!user)
            throw new Utils_1.NotFoundExption("User not found");
        if (!(await Utils_1.HashingService.Compare(Password, user.Password)))
            throw new Utils_1.BadRequstExption("Invalid Password");
        // ----------------------------------------------------------------------
        const Credentials = await Utils_1.JWTService.CredentialsGenerator(user);
        return (0, Utils_1.SuccessResponse)({
            res,
            message: "logged in successfully",
            data: Credentials,
        });
    };
    // -—-—-—-—-—-—-—-—-—-—-—-—<< Confirm Email Routers >>--—-—-—-—-—-—-—-—-—-—-—-—-—-—-—-—
    SendConfirmEmail = async (req, res) => {
        // step1 > get the user email
        const { Email } = req.body;
        // step2 > send otp using email and emailtype for prefix
        await Utils_1.OtpService.SendOTP({ Email, EmailType: Email_templet_1.EmailType.ConfirmEmail });
        return (0, Utils_1.SuccessResponse)({ res, message: "check your Email" });
    };
    ConfirmEmail = async (req, res) => {
        // step1 > get the  otp and email
        const { OTP, Email } = req.body;
        // ----------------------------------------------------------------------
        // step2 > get the hased otp form redis
        // step3 > compare the otp with the hashed one
        // -- step2 + step3 = VerifyOTP
        const otp_r = await Utils_1.OtpService.VerifyOTP(Email, OTP, Email_templet_1.EmailType.ConfirmEmail);
        if (!otp_r)
            throw new Utils_1.BadRequstExption("Invalid OTP");
        // ----------------------------------------------------------------------
        // step4 > update user date
        const result = (await this._UserRepository.updateOne({
            filter: { Email: Email },
            update: { confirmEmail: new Date() },
        })) || "";
        if (!result)
            throw new Utils_1.ConflictExption("Error while updating user data ...");
        return (0, Utils_1.SuccessResponse)({
            res,
            message: "Email Confirmed Successfly",
            data: result,
        });
    };
}
exports.default = new AuthService();
