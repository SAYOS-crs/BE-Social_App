"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("../Utils");
const Utils_2 = require("../Utils");
/**
 * Closure-based authentication middleware factory.
 * Returns an Express middleware that verifies the incoming request's token
 * and attaches the authenticated user + decoded payload to `req`.
 *
 * @param tokenType - TokenType enum — specifies which signature is valid for
 *                    this route (Access | Refresh). Pass TokenType.Access for
 *                    protected routes, TokenType.Refresh for token-renewal routes.
 * @returns Express RequestHandler — verifies the token, populates req.user
 *          and req.decoded, then calls next(). Calls next(error) on failure.
 */
const Authentication = (tokenType) => {
    return async (req, res, next) => {
        try {
            // guard: authorization header must be present in the request
            const authorization = req.headers.authorization;
            if (!authorization)
                throw new Utils_2.UnAuthroizedExption("Authorization header is required");
            // decode: verify the token and retrieve the authenticated user
            const { user, decoded } = await Utils_1.JWTService.Decode(authorization, tokenType);
            // attach user and decoded payload to the request for downstream handlers
            req.user = user;
            req.decoded = decoded;
            next();
        }
        catch (error) {
            // forward any UnAuthroizedExption / NotFoundExption to the global error handler
            next(error);
        }
    };
};
exports.default = Authentication;
