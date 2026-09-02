import { Router } from "express";
import postService from "./post.service";
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
import Validation from "../../Middlewares/Validation.middleware";
import {
  PostValidationSchema,
  RetrievePostValidationSchema,
} from "./post.validation";

const router: Router = Router();

router.post(
  "/create",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  CloudFileUpload({
    StorageAprotch: StorageAprotches.Memory,
    maxSize: 5,
  }).array("attachments", 5),
  FileFilter(AllowedFileTypes.photo),
  Validation(PostValidationSchema),
  postService.createPost,
);

router.get(
  "/{:id}",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  Validation(RetrievePostValidationSchema),
  postService.retrievePosts,
);

export default router;
