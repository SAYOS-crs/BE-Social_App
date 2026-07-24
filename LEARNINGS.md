# Express TypeScript & JWT Architecture Conventions

## 1. Express Request Type Augmentation (`ts-node` & `tsc`)
When adding custom properties (such as `req.user` or `req.decoded`) to the Express `Request` object in TypeScript:
- Do NOT use standalone `.d.ts` files with `declare global` without proper module declaration, as `ts-node` may fail to pick them up.
- Create `@types/express/index.d.ts` extending `"express-serve-static-core"` directly:
  ```ts
  import { JwtPayload } from "jsonwebtoken";
  import { HUserDocument } from "../../src/DB/models/User.model";
  import { ITokenPayload } from "../../src/Utils/Security/JWT.service";

  declare module "express-serve-static-core" {
    interface Request {
      user?: HUserDocument;
      decoded?: ITokenPayload & JwtPayload;
    }
  }
  ```
- Ensure `tsconfig.json` includes `typeRoots` to include both local `@types` and `node_modules/@types`:
  ```json
  "typeRoots": ["./node_modules/@types", "./@types"],
  "types": ["node", "express"]
  ```

## 2. JWT & Authentication Middleware Architecture
- **Role Signatures**: `JWTService.SignatureIdentifier(role)` provides access/refresh secrets specific to user roles.
- **Token Verification**: `JWTService.VerifyToken(token, signature)` decodes raw JWT token.
- **Decode Method**: `JWTService.Decode(authorization, tokenType)` extracts bearer/token from Authorization header (`"<Role> <Token>"`), selects corresponding signature for `tokenType`, verifies token, and queries DB repository to return `{ user, decoded }`.
- **Auth Middleware**: `Authentication(tokenType: TokenType)` closure-based middleware passes authorization header to `JWTService.Decode` and populates `req.user` and `req.decoded`.
