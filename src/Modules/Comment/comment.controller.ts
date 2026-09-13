import { Router } from "express";
import commentService from "./comment.service";
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
  CommentReplyValidationSchema,
  CommentValidationSchema_Create,
} from "./comment.validation";

const router: Router = Router({ mergeParams: true });

router.post(
  "/",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  CloudFileUpload({
    StorageAprotch: StorageAprotches.Memory,
    maxSize: 2,
  }).array("attachments", 3),
  FileFilter(AllowedFileTypes.photo),
  Validation(CommentValidationSchema_Create),
  commentService.CreateComment,
);
router.post(
  "/:CommentId/replayComment",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  CloudFileUpload({
    StorageAprotch: StorageAprotches.Memory,
    maxSize: 2,
  }).array("attachments", 3),
  FileFilter(AllowedFileTypes.photo),
  Validation(CommentReplyValidationSchema),
  commentService.CreateReplayComment,
);

export default router;
