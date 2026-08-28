import z, { RefinementCtx } from "zod";
import { AllowedFileTypes, GeneralFields } from "../../Utils";
import mongoose, { ObjectId, Types } from "mongoose";

function CustomValidate(
  field: string[] | string,
  path: string,
  ctx: RefinementCtx,
) {
  // field === the object that carry [] or string will be tags or likes
  // path === filed name to use it in ctx issues
  // ctx === the coustom error handler for superRefine
  // ============================================================
  //step 1 : set uniqueTags
  // if field is array = distruct the unique indexes
  // if field not array + that mean its string = set it in array to itrate on it
  const uniqueTags: string[] = Array.isArray(field)
    ? [...new Set(field)]
    : [field];
  // --------------------------------------------------------------------------------
  // --------------------------------------------------------------------------------
  // --------------------------------------------------------------------------------
  // step 2 : check if field is array for array condition
  // will check if field.length (in array case) === uniqueTags.length
  // that prevent the dublecate issue
  if (Array.isArray(field)) {
    if (uniqueTags.length != field.length) {
      ctx.addIssue({
        code: "custom",
        path: [`${path}`],
        message: `${path} must be unique , it cant be duplicated`,
      });
    }
  }
  // --------------------------------------------------------------------------------
  // --------------------------------------------------------------------------------
  // --------------------------------------------------------------------------------
  // step 3 : check for invalid id
  // we will bick form uniqueTags
  // if id in not valid stake that id in array( >>FalseId<< )
  // after itrating check if there FalseId
  let FalseId: string[] = [];
  for (const tag of uniqueTags) {
    if (!Types.ObjectId.isValid(tag as string)) {
      FalseId.push(tag);
    }
  }
  if (FalseId.length) {
    ctx.addIssue({
      code: "custom",
      path: [`${path}`],
      message: `invalid ${path} id : ${FalseId}`,
    });
  }
}

const PostValidationSchema = {
  body: z
    .strictObject({
      content: GeneralFields.content.optional(),
      files: z.array(GeneralFields.file(AllowedFileTypes.photo)).optional(),

      tags: GeneralFields.tags.optional(),
      likes: GeneralFields.tags.optional(),
      visibility: GeneralFields.visibility.optional(),
    })
    .superRefine((values, ctx) => {
      if (!values.content && !values.files) {
        ctx.addIssue({
          code: "custom",
          path: ["content"],
          message: "it must be there content or attachment",
        });
      }
      // check if there duplicate in tags and likes
      // tags
      if (values.tags?.length) {
        CustomValidate(values.tags, "tags", ctx);
        // const uniqueTags: string[] = [...new Set(values.tags)];
        // if (uniqueTags.length != values.tags.length) {
        //   ctx.addIssue({
        //     code: "custom",
        //     path: ["tags"],
        //     message: "tags must be unique , it cant be duplicated",
        //   });
        // }
        // // check for id
        // let FalseId: string[] = [];
        // for (const tag of uniqueTags) {
        //   if (!Types.ObjectId.isValid(tag)) {
        //     FalseId.push(tag);
        //   }
        // }
        // if (FalseId.length) {
        //   ctx.addIssue({
        //     code: "custom",
        //     path: ["tags"],
        //     message: `invalid tag id : ${FalseId}`,
        //   });
        // }
      }
      // likes
      if (values.likes?.length) {
        // const uniquelikes: string[] = [...new Set(values.likes)];
        // if (uniquelikes.length != values.likes.length) {
        //   ctx.addIssue({
        //     code: "custom",
        //     path: ["likes"],
        //     message:
        //       "there is a duplication in likes , user can do one like only!",
        //   });
        // }
        CustomValidate(values.likes, "likes", ctx);
      }
    }),
};
export default PostValidationSchema;
