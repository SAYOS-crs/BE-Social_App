import { Router } from "express";
import UserService from "./user.service";
import { Authentication, Authorization } from "../../Middlewares";
import { Rolle, TokenType } from "../../Utils";

const router = Router();

router.get(
  "/profile",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  UserService.GetUserProfile,
);

export default router;
