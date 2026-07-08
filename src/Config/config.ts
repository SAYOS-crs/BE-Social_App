import { config } from "dotenv";
import { resolve } from "node:path";

config({
  path: resolve(
    process.env["NODE_ENV"] === "development"
      ? "./src/Config/dev.env"
      : "./dist/Config/prod.env",
  ),
});

// --------------- env attriputes
export const PORT = process.env["PORT"];
