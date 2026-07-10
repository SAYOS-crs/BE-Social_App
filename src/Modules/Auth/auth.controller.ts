import { Router } from "express";
import authService from "./auth.service";
import Validation from "../../Middlewares/Validation.middleware";
import { SignupSchema } from "./auth.validation";

const router: Router = Router();

router.post("/signup", Validation(SignupSchema), authService.SignUp);

export default router;
