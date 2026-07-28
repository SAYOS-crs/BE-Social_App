import * as z from "zod";
import { GeneralFields } from "../../Utils";
import { Enums } from "../../Utils";

export const SignupSchema = {
  body: z
    .strictObject({
      username: z.string(),
      Email: GeneralFields.Email,
      Password: GeneralFields.Password,
      confirmPassword: z.string(),
      phone: z.string(),
      address: z.string(),
      Gender: z.enum(Object.values(Enums.Gender)),
      // Rolle: z.enum(Object.values(Enums.Rolle)).optional(),
      // Providers: z.enum(Object.values(Enums.Providers)).optional(),
    })
    .superRefine((value, ctx) => {
      if (value.confirmPassword !== value.Password) {
        ctx.addIssue({
          path: ["confirmPassword"],
          code: "custom",
          message: "invalid confirm password , its not match with password",
        });
      }
    }),
};

export const LoginSchema = {
  body: z.strictObject({
    Email: GeneralFields.Email,
    Password: GeneralFields.Password,
  }),
};
