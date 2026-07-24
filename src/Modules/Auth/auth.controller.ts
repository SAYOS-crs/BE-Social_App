import { Router } from "express";
import authService from "./auth.service";
import Validation from "../../Middlewares/Validation.middleware";
import { SignupSchema } from "./auth.validation";

const router: Router = Router();

router.post("/signup", Validation(SignupSchema), authService.SignUp);
router.post("/SendConfirmationEmail", authService.SendConfirmEmail);
router.patch("/ConfirmEmail", authService.ConfirmEmail);
export default router;
