import * as z from "zod";

export const loginschema = {
  body: z
    .strictObject({
      email: z.string().max(19, "max length is 19").min(9, "min length in 9"),
      password: z.string().max(20, "max password length is 20"),
      confirmPassword: z.string(),
    })
    .superRefine((value, ctx) => {
      if (value.confirmPassword !== value.password) {
        ctx.addIssue({
          path: ["confirmPassword"],
          code: "custom",
          message: "invalid confirm password , its not match with password",
        });
      }
    }),
};
