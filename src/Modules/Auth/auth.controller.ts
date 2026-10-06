import { Request, Response, Router } from "express";
import { HUserDocument } from "../../DB/models/User.model";
import Validation from "../../Middlewares/Validation.middleware";
import { SuccessResponse } from "../../Utils";
import { I_AuthSignUpDTO } from "./auth.dto";
import authService from "./auth.service";
import { LoginSchema, SignupSchema } from "./auth.validation";

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

router.post("/login", Validation(LoginSchema), authService.Login);
router.post("/SendConfirmationEmail", authService.SendConfirmEmail);
router.patch("/ConfirmEmail", authService.ConfirmEmail);
export default router;
