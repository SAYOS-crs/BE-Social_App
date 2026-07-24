import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { HUserDocument, IUser } from "../../DB/models/User.model";
import { NotFoundExption, UnAuthroizedExption } from "../response";
import {
  JWT_USER_ACCESS_SECRET,
  JWT_USER_REFRESH_SECRET,
  JWT_ADMIN_ACCESS_SECRET,
  JWT_ADMIN_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
} from "../../Config/config";
import { Rolle, TokenType } from "../Enums/enum";
import UserRepository from "../../DB/Repository/User.Repository";

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

export interface IDecodeResult {
  user: HUserDocument;
  decoded: ITokenPayload & JwtPayload;
}

// ─── JWT Service ──────────────────────────────────────────────────────────────

class JWTService {
  private readonly _accessExpiresIn: number = JWT_ACCESS_EXPIRES_IN ?? 900;
  private readonly _refreshExpiresIn: number = JWT_REFRESH_EXPIRES_IN ?? 3600;
  private readonly _userRepository = new UserRepository();

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
  CredentialsGenerator(user: IUser): ITokenPair {
    if (!user.id) throw new NotFoundExption("User not found");
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
   * Verifies and decodes a JWT token.
   * @param token     - The raw JWT string.
   * @param signature - The signing secret used when the token was issued.
   * @returns ITokenPayload & JwtPayload — the decoded token payload.
   */
  VerifyToken(token: string, signature: string): ITokenPayload & JwtPayload {
    // guard: both params must be provided
    if (!token || !signature)
      throw new UnAuthroizedExption("Token and signature are required");

    // guard: verify the token — throws if expired or tampered
    try {
      return jwt.verify(token, signature) as ITokenPayload & JwtPayload;
    } catch {
      throw new UnAuthroizedExption("Invalid signature");
    }
  }

  // ── Decode ───────────────────────────────────────────────────────────────────

  /**
   * Decodes an incoming authorization header and returns the authenticated user.
   * Intended to be called exclusively from the authentication middleware.
   *
   * Flow:
   *   1. Destructure `authorization` into { token, bearer }.
   *   2. Derive the correct signing secrets via SignatureIdentifier(bearer as Rolle).
   *   3. Select the right secret based on `tokenType` (Access | Refresh).
   *   4. Verify & decode the token with VerifyToken.
   *   5. Look up the user by the decoded userId and return the document.
   *
   * @param authorization - Raw Authorization header value (e.g. "User eyJ...").
   * @param tokenType     - TokenType enum — which signature slot to validate against (Access | Refresh).
   * @returns Promise<IDecodeResult> — { user, decoded } the authenticated user document and the decoded token payload.
   * @throws UnAuthroizedExption  if the header is missing / malformed.
   * @throws NotFoundExption      if no user matches the decoded userId.
   */
  async Decode(
    authorization: string,
    tokenType: TokenType,
  ): Promise<IDecodeResult> {
    // guard: authorization header must be present
    if (!authorization)
      throw new UnAuthroizedExption("Authorization header is required");

    // step 1 — split the header into bearer (role identifier) and raw token
    const [bearer, token] = authorization.split(" ");

    if (!bearer || !token)
      throw new UnAuthroizedExption(
        "Malformed authorization header — expected format: '<Role> <token>'",
      );

    // step 2 — retrieve the signing secret pair for this role
    const signatures = this.SignatureIdentifier(bearer as Rolle);

    // step 3 — pick the correct secret based on the requested token type
    const signature =
      tokenType === TokenType.Access
        ? signatures.accessSignature
        : signatures.refreshSignature;

    // step 4 — verify and decode the token (throws on invalid / expired)
    const decoded = this.VerifyToken(token, signature);

    // step 5 — look up the user in the database by the decoded userId
    const user = await this._userRepository.findOne({
      filter: { _id: decoded.userId },
    });

    if (!user) throw new NotFoundExption("User not found");

    return { user: user as HUserDocument, decoded };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────
export default new JWTService();
