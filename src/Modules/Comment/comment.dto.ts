import z from "zod";
import { CommentValidationSchema_Create } from "./comment.validation";

export type I_CreatePost_DTO = z.infer<
  typeof CommentValidationSchema_Create.body
>;
