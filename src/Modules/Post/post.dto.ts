import z from "zod";
import PostValidationSchema from "./post.validation";

export type I_CreatePost_dto = z.infer<typeof PostValidationSchema.body>;
