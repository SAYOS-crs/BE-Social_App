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
  PostReactValidationSchema,
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
  "/{:postId}",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  Validation(RetrievePostValidationSchema),
  postService.retrievePosts,
);

router.put(
  "/react/:postId",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  Validation(PostReactValidationSchema),
  postService.reactOnPost,
);

export default router;
