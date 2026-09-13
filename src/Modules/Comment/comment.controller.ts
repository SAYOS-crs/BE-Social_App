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
  GetCommentRepliesValidationSchema,
  GetPostCommentsValidationSchema,
} from "./comment.validation";

const router: Router = Router({ mergeParams: true });

/**
 * ---------------------------------------------------------------------------------------
 * Router: GET /
 * Purpose: Retrieve all top-level comments for a specific post.
 * Handler: commentService.GetPostComments
 * Explanation:
 * - Fetches comments matching the given PostId where RepliedOn does not exist (top-level).
 * - Applies visibility checks based on the authenticated user.
 * ---------------------------------------------------------------------------------------
 */
router.get(
  "/",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  Validation(GetPostCommentsValidationSchema),
  commentService.GetPostComments,
);

/**
 * ---------------------------------------------------------------------------------------
 * Router: GET /:CommentId
 * Purpose: Retrieve a specific comment and populate its replies (RepliedList).
 * Handler: commentService.GetCommentReplies
 *
 * What was wrong:
 * - The service was querying Post and Comment using { id: PostId } and { id: CommentId }.
 * - In MongoDB, the unique primary key is `_id`. `id` is only a Mongoose virtual getter.
 * - Because `strictQuery: true` is enabled, Mongoose stripped out the non-schema field `id`.
 * - This left only the visibility check `{ $or: [...] }`, so MongoDB always returned the
 *   first public document found in the collection, even when given an invalid ID.
 *
 * How we fixed it:
 * - Updated query filters to use `{ _id: PostId }` and `{ _id: CommentId }`.
 * - Now MongoDB accurately queries the document by its ObjectId and returns null (404 Not Found)
 *   if the ID does not exist.
 * ---------------------------------------------------------------------------------------
 */
router.get(
  "/:CommentId",
  Authentication(TokenType.Access),
  Authorization([Rolle.User, Rolle.Admin]),
  Validation(GetCommentRepliesValidationSchema),
  commentService.GetCommentReplies,
);

/**
 * ---------------------------------------------------------------------------------------
 * Router: POST /
 * Purpose: Create a new comment under a specific post.
 * Handler: commentService.CreateComment
 *
 * What was wrong:
 * - The post lookup was using `filter: { id: PostId }` instead of `filter: { _id: PostId }`.
 * - With `strictQuery: true`, `id` was stripped out, matching the first post in the DB
 *   instead of validating the actual target post.
 *
 * How we fixed it:
 * - Updated the post lookup filter to `{ _id: PostId }`.
 * ---------------------------------------------------------------------------------------
 */
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

/**
 * ---------------------------------------------------------------------------------------
 * Router: POST /:CommentId/replayComment
 * Purpose: Create a reply to an existing comment and link it in the parent's RepliedList.
 * Handler: commentService.CreateReplyComment
 *
 * What was wrong:
 * - Used `filter: { id: PostId }` and `filter: { id: CommentId }` to look up post & comment.
 * - Used `filter: { id: comment.id }` in updateOne/DeleteOne operations.
 * - Stripped `id` fields caused query mismatch and returned the first document.
 *
 * How we fixed it:
 * - Changed all lookup, update, and delete filters to use `_id: ...`.
 * ---------------------------------------------------------------------------------------
 */
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
  commentService.CreateReplyComment,
);

export default router;
