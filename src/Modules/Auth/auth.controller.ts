import { Request, Response, Router } from "express";
import { HUserDocument } from "../../DB/models/User.model";
import Validation from "../../Middlewares/Validation.middleware";
import { BadRequstExption, ITokenPair, SuccessResponse } from "../../Utils";
import {
  I_AuthLoginDTO,
  I_AuthSendConfirmEmailDTO,
  I_AuthSignUpDTO,
} from "./auth.dto";
import authService from "./auth.service";
import {
  LoginSchema,
  SendConfirmationEmailsSchema,
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

router.post(
  "/SendConfirmationEmail",
  Validation(SendConfirmationEmailsSchema),
  async (req: Request, res: Response): Promise<Response> => {
    const { Email }: I_AuthSendConfirmEmailDTO = req.body;
    const result = await authService.SendConfirmEmail({ Email });
    if (!result) {
      throw new BadRequstExption("error while sending email OTP");
    }
    return SuccessResponse({
      res,
      message: `OTP send successfly to : ${Email} `,
    });
  },
);
router.patch("/ConfirmEmail", authService.ConfirmEmail);
export default router;
