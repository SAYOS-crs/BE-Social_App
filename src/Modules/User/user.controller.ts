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

router.post(
  "/assignFCMtoken",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  UserService.GetFCM_Token,
);

router.post(
  "/sendNotification",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  UserService.sendNotification,
);

export default router;
