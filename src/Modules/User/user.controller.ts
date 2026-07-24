import { Router } from "express";
import UserService from "./user.service";
import { Authentication } from "../../Middlewares";
import { TokenType } from "../../Utils";

const router = Router();

router.get(
  "/profile",
  Authentication(TokenType.Access),
  UserService.GetUserProfile,
);

export default router;
