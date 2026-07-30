"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_REFRESH_EXPIRES_IN = exports.JWT_ACCESS_EXPIRES_IN = exports.JWT_ADMIN_REFRESH_SECRET = exports.JWT_ADMIN_ACCESS_SECRET = exports.JWT_USER_REFRESH_SECRET = exports.JWT_USER_ACCESS_SECRET = exports.PASS = exports.EMAIL = exports.REDIS_URL = exports.SECRET_KEY = exports.IV_LENGTH = exports.SULT = exports.DB_URI = exports.PORT = void 0;
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
(0, dotenv_1.config)({
    path: (0, node_path_1.resolve)(process.env["NODE_ENV"] === "development"
        ? "./src/Config/dev.env"
        : "./dist/Config/prod.env"),
});
const GetENV = (key) => {
    if (!key)
        return undefined;
    return process.env[key];
};
// --------------- env attriputes
exports.PORT = GetENV("PORT");
exports.DB_URI = GetENV("DB_URI") || "";
exports.SULT = Number(GetENV("SULT"));
exports.IV_LENGTH = Number(GetENV("IV_LENGTH"));
exports.SECRET_KEY = GetENV("SECRET_KEY");
exports.REDIS_URL = GetENV("REDIS_URL") || "";
exports.EMAIL = GetENV("EMAIL") || "";
exports.PASS = GetENV("PASS") || "";
// ─── JWT ─────────────────────────────────────────────────────────────────────
exports.JWT_USER_ACCESS_SECRET = GetENV("JWT_USER_ACCESS_SECRET");
exports.JWT_USER_REFRESH_SECRET = GetENV("JWT_USER_REFRESH_SECRET");
exports.JWT_ADMIN_ACCESS_SECRET = GetENV("JWT_ADMIN_ACCESS_SECRET");
exports.JWT_ADMIN_REFRESH_SECRET = GetENV("JWT_ADMIN_REFRESH_SECRET");
exports.JWT_ACCESS_EXPIRES_IN = Number(GetENV("JWT_ACCESS_EXPIRES_IN"));
exports.JWT_REFRESH_EXPIRES_IN = Number(GetENV("JWT_REFRESH_EXPIRES_IN"));
