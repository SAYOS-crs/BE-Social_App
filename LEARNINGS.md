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

## 3. Zod Validation Architecture
- **General Fields**: Reusable Zod field definitions live in `src/Utils/Validation/general.fields.ts` and are exported via `Utils` barrel.
- **Compose, don't duplicate**: Module-specific schemas (e.g., `LoginSchema`, `SignupSchema`) should import and reuse fields from `GeneralFields` instead of defining inline validations.
- **DTO pattern**: Each module has a `.dto.ts` file with types inferred from schemas via `z.infer<>`, plus response interfaces where needed.
- **OTP is exactly 6 characters**: Always use `.length(6)`, never a min/max range.

## 4. Git Workflow Preferences
- **Atomic commits by feature**: When multiple features/concerns are changed, split them into separate commits grouped by feature (e.g., one commit for authorization middleware, another for validation).
- **Conventional commit messages**: Use the `feat:` / `fix:` / `refactor:` prefix convention with a descriptive subject line and bullet-point body listing specific changes.

## 5. Obsidian Task Documentation Standard (Task Life Cycle Format)
Whenever asked to document a task in the Obsidian Vault (`/home/sayos/Documents/Obsidian Vault/Project/<ProjectName>/`), follow this strict structure:

1. **Frontmatter & Header**:
   - YAML frontmatter with relevant `tags` and `date_created`.
   - Title header (`# 🔐 Topic - <Task Name>`).

2. **Task Life Cycle Flow Diagram**:
   - A Mermaid diagram at the top illustrating the complete sequence/flow from incoming request to controller execution and error handling.

3. **Step-by-Step Task Breakdown**:
   For **every step** in the task life cycle:
   - **Step Title**: e.g., `### 🔷 Step X: <Step Name>`
   - **Details (Take, Do/Logic, Return)**:
     - **Take (Inputs)**: Parameters, headers, or state received by the step.
     - **Do / Logic**: Exact operations, checks, guards, and algorithms performed.
     - **Return (Outputs)**: Produced values, errors passed to `next()`, or next function calls.
   - **Code**: The exact TypeScript implementation snippet for that step.
   - **Step Summary**: A concise blockquote summary highlighting what the step accomplishes.

4. **Summary Checklist**:
   - A final bulleted checklist (`- [x]`) confirming all requirements, safety checks, and modular exports.


