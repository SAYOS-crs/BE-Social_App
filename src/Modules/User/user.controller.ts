import { Router } from "express";
import UserService from "./user.service";
import {
  Authentication,
  Authorization,
  CloudFileUpload,
} from "../../Middlewares";
import {
  AllowedFileTypes,
  FileFilter,
  Rolle,
  StorageAprotches,
  TokenType,
} from "../../Utils";

const router = Router();

router.get(
  "/profile",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  UserService.GetUserProfile,
);

router.patch(
  "/addUserPhoto",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  CloudFileUpload({
    StorageAprotch: StorageAprotches.Memory,
    maxSize: 5,
  }).single("photo"),
  FileFilter(AllowedFileTypes.photo),
  UserService.AddUserPhoto,
);

router.get("/getUserAsset/*path", UserService.getUserAsset);
router.get("/RetrievePresignedURL/*path", UserService.Retrieve_PresignedURL);

router.put(
  "/addUserLargeFile",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  CloudFileUpload({ StorageAprotch: StorageAprotches.Disk }).single(
    "LargeFile",
  ),
  FileFilter(AllowedFileTypes.photo),
  UserService.AddUserLargeFile,
);

router.put(
  "/AddMultiFiles",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  CloudFileUpload({
    StorageAprotch: StorageAprotches.Memory,
    maxSize: 20,
  }).array("images", 3),
  // FileFilter(AllowedFileTypes.photo),
  UserService.AddMultiFiles,
);

router.get(
  "/PresignedURL",
  Authentication(TokenType.Access),
  Authorization([Rolle.User]),
  UserService.PresignedURL,
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
