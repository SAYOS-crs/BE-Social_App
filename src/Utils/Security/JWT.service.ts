import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { HUserDocument } from "../../DB/models/User.model";
import { UnAuthroizedExption } from "../response";
import {
  JWT_USER_ACCESS_SECRET,
  JWT_USER_REFRESH_SECRET,
  JWT_ADMIN_ACCESS_SECRET,
  JWT_ADMIN_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
} from "../../Config/config";
import { Rolle } from "../Enums/enum";

// ─── Interfaces ───────────────────────────────────────────────────────────────

/** Shape of the data signed into every JWT (jti is appended internally by TokenGenerator). */
export interface ITokenPayload {
  userId: string;
  jti?: string; // unique token ID (uuid v4) — appended by TokenGenerator, used for revocation
}

export interface ISignatureIdentifier {
  accessSignature: string;
  refreshSignature: string;
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── JWT Service ──────────────────────────────────────────────────────────────

class JWTService {
  private readonly _accessExpiresIn: number = JWT_ACCESS_EXPIRES_IN ?? 900;
  private readonly _refreshExpiresIn: number = JWT_REFRESH_EXPIRES_IN ?? 3600;

  constructor() {}

  // ── Signature Identifier ──────────────────────────────────────────────────

  /**
   * Returns the access & refresh signing secrets for the given role.
   * @param role  - Rolle enum value (User | Admin).
   * @returns ISignatureIdentifier — { accessSignature, refreshSignature }
   *          Each role has its own dedicated secret pair, so a token signed
   *          for one role can never be verified against another role's secret.
   */
  SignatureIdentifier(role: Rolle): ISignatureIdentifier {
    switch (role) {
      case Rolle.User:
        return {
          accessSignature: JWT_USER_ACCESS_SECRET!,
          refreshSignature: JWT_USER_REFRESH_SECRET!,
        };

      case Rolle.Admin:
        return {
          accessSignature: JWT_ADMIN_ACCESS_SECRET!,
          refreshSignature: JWT_ADMIN_REFRESH_SECRET!,
        };
    }
  }

  // ── Token Generator ───────────────────────────────────────────────────────

  /**
   * Creates and signs a single JWT token.
   * Internally generates a jti (uuid v4) and appends it to the payload before signing.
   * @param payload    - ITokenPayload — { userId }; jti is appended internally.
   * @param signature  - The secret string used to sign this token (from SignatureIdentifier).
   * @param expiresIn  - Expiration time in seconds.
   * @returns Signed JWT token string.
   */
  TokenGenerator(
    payload: ITokenPayload,
    signature: string,
    expiresIn: number,
  ): string {
    const jti = uuidv4(); // unique token ID — appended to payload for future revocation support

    const fullPayload: ITokenPayload = { ...payload, jti };

    const options: SignOptions = { expiresIn };

    return jwt.sign(fullPayload, signature, options);
  }

  // ── Credentials Generator ─────────────────────────────────────────────────

  /**
   * Generates an access + refresh token pair for a given user.
   * Uses the user's role to pick the correct signing secrets via SignatureIdentifier,
   * then calls TokenGenerator for each token with the user's id as the payload.
   * @param user - HUserDocument — the authenticated user document from the DB.
   * @returns ITokenPair — { accessToken, refreshToken } signed with the user's role secrets.
   */
  CredentialsGenerator(user: HUserDocument): ITokenPair {
    const signatures = this.SignatureIdentifier(user.Rolle);

    const accessToken = this.TokenGenerator(
      { userId: user.id },
      signatures.accessSignature,
      this._accessExpiresIn,
    );

    const refreshToken = this.TokenGenerator(
      { userId: user.id },
      signatures.refreshSignature,
      this._refreshExpiresIn,
    );

    return { accessToken, refreshToken };
  }

  // ── Verify Token ─────────────────────────────────────────────────────────────

  /**
   * Verifies and decodes a JWT from the Authorization header.
   * @param authorization - The raw Authorization header value (e.g. "User <token>" or "Admin <token>").
   *                        Split by " " → [0] = role (Bearer) used to resolve the signature,
   *                                      [1] = the JWT token string.
   * @returns ITokenPayload & JwtPayload — the decoded token payload.
   */
  VerifyToken(authorization: string): ITokenPayload & JwtPayload {
    const [bearer, token] = authorization.split(" ");

    // guard: both parts must exist after the split
    if (!bearer || !token)
      throw new UnAuthroizedExption("Invalid authorization header format");

    const { accessSignature } = this.SignatureIdentifier(bearer as Rolle);

    // guard: verify the token — throws if expired or tampered
    try {
      return jwt.verify(token, accessSignature) as ITokenPayload & JwtPayload;
    } catch {
      throw new UnAuthroizedExption("Invalid or expired token");
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────
export default new JWTService();
