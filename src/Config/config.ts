import { config } from "dotenv";
import { resolve } from "node:path";

config({
  path: resolve(
    process.env["NODE_ENV"] === "development"
      ? "./src/Config/dev.env"
      : "./dist/Config/prod.env",
  ),
});
const GetENV = (key: string) => {
  if (!key) return undefined;
  return process.env[key];
};
// --------------- env attriputes
export const PORT = GetENV("PORT");
export const DB_URI = GetENV("DB_URI") || "";
export const SULT = Number(GetENV("SULT"));
export const IV_LENGTH = Number(GetENV("IV_LENGTH"));
export const SECRET_KEY = GetENV("SECRET_KEY");
