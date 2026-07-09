import { Router } from "express";
import authService from "./auth.service";
import Validation from "../../Middlewares/Validation.middleware";
import { loginschema } from "./auth.validation";

const router: Router = Router();

router.post("/login", Validation(loginschema), authService.Login);

export default router;
