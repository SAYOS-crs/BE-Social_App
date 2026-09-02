import z from "zod";
import {
  PostValidationSchema,
  RetrievePostValidationSchema,
} from "./post.validation";

export type I_CreatePost_dto = z.infer<typeof PostValidationSchema.body>;

export type I_RetrievePost_params_dto = z.infer<
  typeof RetrievePostValidationSchema.params
>;
export type I_RetrievePost_query_dto = z.infer<
  typeof RetrievePostValidationSchema.query
>;
