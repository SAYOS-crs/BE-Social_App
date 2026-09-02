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

## 5. Obsidian Task Documentation Standard (The Gold Standard)
Whenever asked to document or explain a module, model, or architectural task in the Obsidian Vault (`/home/sayos/MERN/Docs/Obsidian_BackEnd-Documentation/`):

1. **Modular Dedicated Files Organization**:
   - `00 - <Module> Master Index.md`: High-level architecture flowchart, table of contents, and overview.
   - `01 - <Module> Model & Repository Setup.md`: Mongoose Interface, HydratedDocument, Schema with conditional rules, Collection naming, and Generic BaseRepository extension.
   - `02 - <Module> Validation, DTOs & General Fields.md`: Zod schema, form-data union handling, custom validations (deduplication & ObjectId checks), superRefine, and DTO inference via `z.infer<>`.
   - `03 - <Module> Controller & Routing Pipeline.md`: Express Router setup and the sequential multi-middleware guard pipeline.
   - `04 - <Module> Service & Business Logic.md`: Lifecycle execution, third-party integrations (S3 / FCM / Mailer), repository interactions, rollback / fallback mechanisms, and success responses.

2. **Core Explanation Principles (Zero-Assumption & High Fidelity)**:
   - **Generalization & Multi-Scenario Explanation (الشرح بالحالة العامة والأنماط الهندسية)**:
     - DO NOT confine the explanation of a method, property, or element to the narrow localized code snippet where it appears.
     - Explain the general concept, underlying pattern, and architectural purpose first (how it works across various backend scenarios).
     - Then, demonstrate how it specifically solves the current scenario in the project.
     - This ensures the documentation serves as an extensible, permanent reference across multiple different scenarios in the future.
   - **Start from Absolute Scratch**: Explain "Why" before "How", third-party dashboard setup (S3 buckets, IAM, policies), and terminal installation commands (`npm i ...`).
   - **Target Audience Mindset**: Write as if the developer is returning after a long break and has forgotten the details—explain every decision, guard, and step cleanly and logically.
   - **Code Comments as Source of Truth**: Deeply inspect and extract all developer inline comments, parameter definitions, fallback mechanisms, and edge-case guards from the codebase.
   - **Typography & Eye Comfort**:
     - Generous spacing between paragraphs and bullet points.
     - Clear visual dividers (`---`) and section badges/emojis.
     - Avoid RTL/LTR text entanglement: isolate technical terms in backticks (\`Symbol\`) and keep code snippets in dedicated code blocks.

3. **Standard Section Structure for Every Document**:
   - **YAML Frontmatter**: Relevant tags and `date_created`.
   - **Header & Concept Overview**: Clean title and core purpose explanation.
   - **Task Life Cycle Flow Diagram**: Mermaid `sequenceDiagram` or `graph TD` illustrating the complete request/response lifecycle.
   - **Step-by-Step Task Breakdown**:
     - `### 🔷 Step X: <Step Name>`
     - `#### 📥 Details`: Take (Inputs), Do / Logic, Return (Outputs).
     - `#### 💻 Code`: TypeScript snippet demonstrating the exact implementation.
     - `#### 📝 Step Summary`: Concise blockquote summary highlighting what the step accomplishes.
   - **Summary Checklist**: Final bulleted checklist (`- [x]`) confirming all requirements, safety checks, and modular exports.

## 6. Multi-File & Buffer Validation Pattern (Magic Numbers & Zod)
- **File Gateway in Validation Middleware**: To enable Zod validation of uploaded files, the validation middleware attaches `req.files` to `req.body.files` before evaluating the body schema.
- **Multi-File Magic Numbers (`FileFilter`)**:
  - Handles both `req.file` and `req.files`.
  - Converts file path or buffer into a buffer stream, inspects real MIME type via `fileTypeFromBuffer`, and collects any disallowed types into an `inValidTypes` array.
  - Throws `ConflictExption` with details of all disallowed types found.

## 7. Zod ObjectId & Flexible Array Refinement
- **Union Types for Form-Data Arrays**: When receiving form-data where arrays may arrive as a single string or an array of strings, use `z.union([z.array(z.string()), z.string()])`.
- **Duplicate & ObjectId Verification**: Use `superRefine` with a helper (e.g. `CustomValidate`) to:
  1. Deduplicate items (`[...new Set(field)]`) and ensure no duplicates were submitted.
  2. Verify all entries are valid MongoDB ObjectIds via `Types.ObjectId.isValid()`.

## 8. Atomic Git Commit Conventions
- When performing multi-feature or multi-layer changes, separate them into granular commits:
  1. **Enums & Constants** (`feat:` / `modify:`)
  2. **Security & Utilities** (e.g. `enhance: multi file validation handeld`)
  3. **General Validation Fields** (e.g. `modify: post fileds added`)
  4. **Middlewares** (e.g. `enhance: file getway form body handeld`)
  5. **Feature Vertical Slice** (Model, Schema, DTO, Service, Controller)
  6. **Cross-Service Refactors** (`refactor:`)




