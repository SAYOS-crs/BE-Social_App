import { z } from "zod";
import { loginschema } from "./auth.validation";

export type I_AuthLoginDTO = z.infer<typeof loginschema.body>;
