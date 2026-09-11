import z from "zod";
import { AllowedFileTypes, GeneralFields } from "../../Utils";
import { CustomValidate } from "../Post/post.validation";

export const CommentValidationSchema_Create = {
  body: z
    .strictObject({
      content: GeneralFields.content.optional(),
      files: z.array(GeneralFields.file(AllowedFileTypes.photo)).optional(),
      visibility: GeneralFields.visibility.optional(),
      tags: GeneralFields.tags.optional(),
    })
    .superRefine((values, ctx) => {
      if (!values.content && !values.files?.length) {
        ctx.addIssue({
          code: "custom",
          path: ["content"],
          message: "there must be content or attachment",
        });
      }
      // --
      if (values.tags?.length) {
        CustomValidate(values.tags, "tags", ctx);
      }
    }),
  params: z.strictObject({
    PostId: GeneralFields.id,
  }),
};
