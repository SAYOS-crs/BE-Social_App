import * as z from "zod";

export const loginschema = {
  body: z.object({
    email: z.string().max(19, "max length is 19").min(9, "min length in 9"),
    password: z.string().max(20, "max password length is 20"),
  }),
};
