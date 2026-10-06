import { z } from "zod";
import { ITokenPair } from "../../Utils";
import { LoginSchema, SignupSchema } from "./auth.validation";

type AuthSignUpType = z.infer<typeof SignupSchema.body>;
// omit dose exclude type from object like confirmPassword cuze we need it only in validation
// why we didnt make I_AuthSignUpDTO from scratch ? cuz we take it from zod and if we want to edit thing in the scheam we edit only in one place (zod)
export type I_AuthSignUpDTO = Omit<AuthSignUpType, "confirmPassword">;
export type I_AuthLoginDTO = z.infer<typeof LoginSchema.body>;

export interface I_AuthLoginResponseDTO extends ITokenPair {}
