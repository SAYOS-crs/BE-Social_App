import { z } from "zod";
import { SignupSchema, LoginSchema } from "./auth.validation";
import { ITokenPair } from "../../Utils";

export type I_AuthSignUpDTO = z.infer<typeof SignupSchema.body>;

export type I_AuthLoginDTO = z.infer<typeof LoginSchema.body>;

export interface I_AuthLoginResponseDTO extends ITokenPair {}
