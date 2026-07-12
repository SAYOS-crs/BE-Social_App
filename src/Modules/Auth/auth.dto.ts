import { z } from "zod";
import { SignupSchema } from "./auth.validation";

export type I_AuthSignUpDTO = z.infer<typeof SignupSchema.body>;
