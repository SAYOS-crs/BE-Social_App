import z from "zod";
import {
  CommentReplyValidationSchema,
  CommentValidationSchema_Create,
  GetCommentRepliesValidationSchema,
  GetPostCommentsValidationSchema,
} from "./comment.validation";

export type I_CreatePost_Body_DTO = z.infer<
  typeof CommentValidationSchema_Create.body
>;

export type I_CreatePost_Params_DTO = z.infer<
  typeof CommentValidationSchema_Create.params
>;

// ---------------------------------------------------
export type I_CommentReply_Body_DTO = z.infer<
  typeof CommentReplyValidationSchema.body
>;
export type I_CommentReply_Params_DTO = z.infer<
  typeof CommentReplyValidationSchema.params
>;
// ---------------------------------------------------

export type I_GetPostComments_Params_DTO = z.infer<
  typeof GetPostCommentsValidationSchema.params
>;
// ---------------------------------------------------
export type I_GetCommentReplies_Params_DTO = z.infer<
  typeof GetCommentRepliesValidationSchema.params
>;
