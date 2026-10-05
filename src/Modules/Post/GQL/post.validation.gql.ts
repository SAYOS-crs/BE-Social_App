import z from "zod";
import { GeneralFields } from "../../../Utils";

export const GetPostsArgs = z.strictObject({
  postId: GeneralFields.id.optional(),
  limit: GeneralFields.limit,
  page: GeneralFields.page,
});
export type GetPostsArgsType = z.infer<typeof GetPostsArgs>;
