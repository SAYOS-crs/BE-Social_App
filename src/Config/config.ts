import { config } from "dotenv";
import { resolve } from "node:path";

config({
  path: resolve(
    process.env["NODE_ENV"] === "development"
      ? "./src/Config/dev.env"
      : "./dist/Config/prod.env",
  ),
});
const GetENV = (key: string): string => {
  return process.env[key] as string;
};
// --------------- env attriputes
export const PORT = GetENV("PORT");
export const DB_URI = GetENV("DB_URI") || "";
export const SULT = Number(GetENV("SULT"));
export const IV_LENGTH = Number(GetENV("IV_LENGTH"));
export const SECRET_KEY = GetENV("SECRET_KEY");
export const REDIS_URL = GetENV("REDIS_URL") || "";
export const EMAIL = GetENV("EMAIL") || "";
export const PASS = GetENV("PASS") || "";
export const CORS_WHITE_LIST = GetENV("CORS_WHITE_LIST") || "";
// ─── JWT ─────────────────────────────────────────────────────────────────────
export const JWT_USER_ACCESS_SECRET = GetENV("JWT_USER_ACCESS_SECRET");
export const JWT_USER_REFRESH_SECRET = GetENV("JWT_USER_REFRESH_SECRET");
export const JWT_ADMIN_ACCESS_SECRET = GetENV("JWT_ADMIN_ACCESS_SECRET");
export const JWT_ADMIN_REFRESH_SECRET = GetENV("JWT_ADMIN_REFRESH_SECRET");
export const JWT_ACCESS_EXPIRES_IN = Number(GetENV("JWT_ACCESS_EXPIRES_IN"));
export const JWT_REFRESH_EXPIRES_IN = Number(GetENV("JWT_REFRESH_EXPIRES_IN"));
// ---- AWS ----------------------------------------------------------------------
export const AWS_REGION: string = GetENV("AWS_REGION");
export const S3_BUCKET_NAME: string = GetENV("S3_BUCKET_NAME");
export const S3_SECRET_ID: string = GetENV("S3_SECRET_ID");
export const S3_SECRET_KEY: string = GetENV("S3_SECRET_KEY");
export const S3_SignedUrl_TTL: number = Number(GetENV("S3_SignedUrl_TTL"));
