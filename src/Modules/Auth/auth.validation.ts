import * as z from "zod";
import { IUser } from "../../DB/models/User.model";
import { Enums } from "../../Utils";

export const loginschema = {
  body: z
    .strictObject({
      username: z.string(),
      Email: z.string().max(19, "max length is 19").min(9, "min length in 9"),
      Password: z.string().max(20, "max password length is 20"),
      confirmPassword: z.string(),
      phone: z.string().optional(),
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
