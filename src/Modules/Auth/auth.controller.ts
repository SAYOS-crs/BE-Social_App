import { Request, Response, Router } from "express";
import { HUserDocument } from "../../DB/models/User.model";
import { Authentication } from "../../Middlewares";
import Validation from "../../Middlewares/Validation.middleware";
import {
  BadRequstExption,
  ConflictExption,
  Guard,
  ITokenPair,
  SuccessResponse,
  TokenType,
} from "../../Utils";
import { I_AuthLoginDTO, I_AuthSignUpDTO } from "./auth.dto";
import authService from "./auth.service";
import {
  ConfirmEmailSchema,
  LoginSchema,
  SignupSchema,
} from "./auth.validation";

const router: Router = Router();

router.post(
  "/signup",
  Validation(SignupSchema),
  async (req: Request, res: Response): Promise<Response> => {
    // 1. distructing
    const {
      Email,
      Gender,
      Password,
      address,
      phone,
      username,
    }: I_AuthSignUpDTO = req.body;
    // 2. reloude the elemnts into payloude object
    const payloude: I_AuthSignUpDTO = {
      Email,
      Gender,
      Password,
      address,
      phone,
      username,
    };
    // 2. send the payloude to signup service
    const result = await authService.SignUp({ payloude });
    return SuccessResponse<HUserDocument>({
      res,
      message: "Account created Successfly",
      data: result,
    });
  },
);

router.post(
  "/login",
  Validation(LoginSchema),
  async (req: Request, res: Response): Promise<Response> => {
    const { Email, Password }: I_AuthLoginDTO = req.body;
    const result = await authService.Login({ payloude: { Email, Password } });
    return SuccessResponse<ITokenPair>({
      res,
      message: "user Loged in Successfly",
      data: result,
    });
  },
);

// user how will confirm email &
router.post(
  "/RequestEmailConfirmation",
  Authentication(TokenType.Access),
  async (req: Request, res: Response): Promise<Response> => {
    const { Email, confirmEmail } = Guard.GetAuthenticatedUser(req);
    // check if the email is confirmed already
    if (confirmEmail) {
      throw new ConflictExption("Email already Confirmed ");
    }
    const result = await authService.RequestEmailConfirmation({ Email });
    if (!result) {
      throw new BadRequstExption("error while sending email OTP");
    }
    return SuccessResponse({
      res,
      message: `OTP send successfly to : ${Email} `,
    });
  },
);

router.patch(
  "/ConfirmEmail",
  Authentication(TokenType.Access),
  Validation(ConfirmEmailSchema),
  async (req: Request, res: Response): Promise<Response> => {
    const { Email, confirmEmail } = Guard.GetAuthenticatedUser(req);
    if (confirmEmail) {
      throw new BadRequstExption("email already Confirmed");
    }
    const { OTP }: { OTP: string } = req.body;
    const result = await authService.ConfirmEmail({ Email, OTP });
    if (!result) {
      throw new BadRequstExption(
        "Error while Confirming Email , try again later",
      );
    }
    return SuccessResponse({ res, message: "Email Confirmed Successfly" });
  },
);
export default router;

// note : in next project do a General Validation Schema for General use like schema for authorixation token (Bearer token)
