import { Router } from "express";
import authService from "./auth.service";

const router: Router = Router();

router.post("/login", authService.Login);

export default router;
