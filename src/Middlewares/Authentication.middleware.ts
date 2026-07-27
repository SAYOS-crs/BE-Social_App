import { NextFunction, Request, Response } from "express";
import { ITokenPayload, JWTService, TokenType } from "../Utils";
import { UnAuthroizedExption } from "../Utils";
import { HUserDocument } from "../DB/models/User.model";
import { JwtPayload } from "jsonwebtoken";

// ─── Authentication Middleware ────────────────────────────────────────────────

export interface IRequest extends Request {
  user?: HUserDocument;

  /** Decoded JWT payload populated by the Authentication middleware. */
  decoded?: ITokenPayload & JwtPayload;
}

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
const Authentication = (tokenType: TokenType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // guard: authorization header must be present in the request
      const authorization = req.headers.authorization;
      if (!authorization)
        throw new UnAuthroizedExption("Authorization header is required");

      // decode: verify the token and retrieve the authenticated user
      const { user, decoded } = await JWTService.Decode(
        authorization,
        tokenType,
      );

      // attach user and decoded payload to the request for downstream handlers
      req.user as HUserDocument = user;
      req.decoded = decoded;

      next();
    } catch (error) {
      // forward any UnAuthroizedExption / NotFoundExption to the global error handler
      next(error);
    }
  };
};

export default Authentication;
