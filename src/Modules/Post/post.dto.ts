import z from "zod";
import {
  PostReactValidationSchema,
  PostValidationSchema,
  RetrievePostValidationSchema,
} from "./post.validation";
import { IPost } from "../../DB/models/Post.model";
import { IUser } from "../../DB/models/User.model";

export type I_CreatePost_dto = z.infer<typeof PostValidationSchema.body >;


// ---------------------------------------------------------
export type I_RetrievePost_params_dto = z.infer<
  typeof RetrievePostValidationSchema.params
  >;

  export type I_RetrievePost_Query_dto = z.infer<
    typeof RetrievePostValidationSchema.query
  >;
export type RetrievePost_dto = {
count: number|undefined,
// posts count
Page_Number: number|undefined,
// page number
from:number|undefined,
// starting point
to:number|undefined,

result : IPost | IPost[]

}
// ---------------------------------------------------------

export type I_PostReact_params_dto = z.infer<
  typeof PostReactValidationSchema.params
>;

export type I_PostReact_query_dto = z.infer<
  typeof PostReactValidationSchema.query
>;
