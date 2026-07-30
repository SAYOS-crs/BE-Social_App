"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const response_1 = require("../response");
const config_1 = require("../../Config/config");
const enum_1 = require("../Enums/enum");
const User_Repository_1 = __importDefault(require("../../DB/Repository/User.Repository"));
// ─── JWT Service ──────────────────────────────────────────────────────────────
class JWTService {
    _accessExpiresIn = config_1.JWT_ACCESS_EXPIRES_IN ?? 900;
    _refreshExpiresIn = config_1.JWT_REFRESH_EXPIRES_IN ?? 3600;
    _userRepository = new User_Repository_1.default();
    constructor() { }
    // ── Signature Identifier ──────────────────────────────────────────────────
    /**
     * Returns the access & refresh signing secrets for the given role.
     * @param role  - Rolle enum value (User | Admin).
     * @returns ISignatureIdentifier — { accessSignature, refreshSignature }
     *          Each role has its own dedicated secret pair, so a token signed
     *          for one role can never be verified against another role's secret.
     */
    SignatureIdentifier(role) {
        switch (role) {
            case enum_1.Rolle.User:
                return {
                    accessSignature: config_1.JWT_USER_ACCESS_SECRET,
                    refreshSignature: config_1.JWT_USER_REFRESH_SECRET,
                };
            case enum_1.Rolle.Admin:
                return {
                    accessSignature: config_1.JWT_ADMIN_ACCESS_SECRET,
                    refreshSignature: config_1.JWT_ADMIN_REFRESH_SECRET,
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
    TokenGenerator(payload, signature, expiresIn) {
        const jti = (0, uuid_1.v4)(); // unique token ID — appended to payload for future revocation support
        const fullPayload = { ...payload, jti };
        const options = { expiresIn };
        return jsonwebtoken_1.default.sign(fullPayload, signature, options);
    }
    // ── Credentials Generator ─────────────────────────────────────────────────
    /**
     * Generates an access + refresh token pair for a given user.
     * Uses the user's role to pick the correct signing secrets via SignatureIdentifier,
     * then calls TokenGenerator for each token with the user's id as the payload.
     * @param user - HUserDocument — the authenticated user document from the DB.
     * @returns ITokenPair — { accessToken, refreshToken } signed with the user's role secrets.
     */
    CredentialsGenerator(user) {
        if (!user.id)
            throw new response_1.NotFoundExption("User not found");
        const signatures = this.SignatureIdentifier(user.Rolle);
        const accessToken = this.TokenGenerator({ userId: user.id }, signatures.accessSignature, this._accessExpiresIn);
        const refreshToken = this.TokenGenerator({ userId: user.id }, signatures.refreshSignature, this._refreshExpiresIn);
        return { accessToken, refreshToken };
    }
    // ── Verify Token ─────────────────────────────────────────────────────────────
    /**
     * Verifies and decodes a JWT token.
     * @param token     - The raw JWT string.
     * @param signature - The signing secret used when the token was issued.
     * @returns ITokenPayload & JwtPayload — the decoded token payload.
     */
    VerifyToken(token, signature) {
        // guard: both params must be provided
        if (!token || !signature)
            throw new response_1.UnAuthroizedExption("Token and signature are required");
        // guard: verify the token — throws if expired or tampered
        try {
            return jsonwebtoken_1.default.verify(token, signature);
        }
        catch {
            throw new response_1.UnAuthroizedExption("Invalid signature");
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
    async Decode(authorization, tokenType) {
        // guard: authorization header must be present
        if (!authorization)
            throw new response_1.UnAuthroizedExption("Authorization header is required");
        // step 1 — split the header into bearer (role identifier) and raw token
        const [bearer, token] = authorization.split(" ");
        if (!bearer || !token)
            throw new response_1.UnAuthroizedExption("Malformed authorization header — expected format: '<Role> <token>'");
        // step 2 — retrieve the signing secret pair for this role
        const signatures = this.SignatureIdentifier(bearer);
        // step 3 — pick the correct secret based on the requested token type
        const signature = tokenType === enum_1.TokenType.Access
            ? signatures.accessSignature
            : signatures.refreshSignature;
        // step 4 — verify and decode the token (throws on invalid / expired)
        const decoded = this.VerifyToken(token, signature);
        // step 5 — look up the user in the database by the decoded userId
        const user = await this._userRepository.findOne({
            filter: { _id: decoded.userId },
        });
        if (!user)
            throw new response_1.NotFoundExption("User not found");
        return { user: user, decoded };
    }
}
// ─── Singleton export ─────────────────────────────────────────────────────────
exports.default = new JWTService();
