import * as z from "zod";
import { PostEnum } from "../Enums";
import { Types } from "mongoose";

/**
 * General reusable Zod fields for validation across all modules.
 * Import these fields to compose schemas instead of duplicating validation logic.
 */
export const GeneralFields = {
  id: z
    .string()
    .refine((v) => Types.ObjectId.isValid(v), { error: "id in not valid" }),
  Email: z
    .string({ message: "Email is required" })
    .email("Invalid email format")
    .max(35, "Email must be at most 35 characters")
    .min(9, "Email must be at least 9 characters")
    .trim()
    .toLowerCase(),

  Password: z
    .string({ message: "Password is required" })
    .max(20, "Password must be at most 20 characters")
    .min(8, "Password must be at least 8 characters"),

  Token: z
    .string({ message: "Token is required" })
    .min(1, "Token must not be empty"),

  OTP: z
    .string({ message: "OTP is required" })
    .length(6, "OTP must be exactly 6 characters"),

  content: z.string(),
  visibility: z.enum(PostEnum.VisibilityEnum),
  fileId: z.string(),

  // last stand was her : the problem was the (tags , likes) expected array but recivied string
  // hint : so we need to make (tags , likes) exept array | string
  // and also we have proplem in file validation
  tags: z.union([z.array(z.string()), z.string()]),
  likes: z.union([z.array(z.string()), z.string()]),

  file: function (mimtype: string[]) {
    return z
      .strictObject({
        fieldname: z.string(),
        originalname: z.string(),
        encoding: z.string(),
        mimetype: z.enum(mimtype, { error: "file type not allowed" }),
        buffer: z.any().optional(),
        path: z.string().optional(),
        size: z.number(),
      })
      .superRefine((values, ctx) => {
        if (!values.path && !values.buffer) {
          ctx.addIssue({
            code: "custom",
            path: ["path", "buffer"],
            message: `there is not path or buffer from file }`,
          });
        }
      });
  },
};
