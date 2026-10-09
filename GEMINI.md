# SocialApp Backend Guidelines & Guardrails

## MongoDB & Mongoose Query Rules

### 1. Always Query by `_id`, Never Virtual `id`
- MongoDB stores document identifiers under `_id`. `id` is a Mongoose virtual getter.
- Because schemas use `strictQuery: true`, querying `{ id: value }` strips the field from the query, leading to silent filter omissions (e.g., matching the first document in the collection when paired with `$or`).
- **Do**:
  ```typescript
  this._Repository.findOne({ filter: { _id: targetId, ... } });
  ```
- **Don't**:
  ```typescript
  this._Repository.findOne({ filter: { id: targetId, ... } }); // ❌ Stripped by strictQuery
  ```

### 2. Query Middleware Hook Behavior (`pre('find')` / `pre('findOne')`)
- Never call `this.findOne(...)` or `this.find(...)` inside query middleware, as this overrides and replaces the entire query filter.
- Use `this.where(...)` to safely append conditions (such as soft-delete filtering) to existing query filters.
- **Do**:
  ```typescript
  UserSchema.pre("findOne", function () {
    this.where({ isDeleted: false });
  });
  ```
- **Don't**:
  ```typescript
  UserSchema.pre("findOne", function () {
    this.findOne({ isDeleted: false }); // ❌ Overwrites query filter
  });
  ```

## Package & Cryptography Guardrails

### 1. TypeScript & ts-node Compatibility
- Never upgrade `typescript` to `7.x` or run unconstrained `npm audit fix --force` that alters the compiler major version.
- Keep `typescript: ^5.x` explicitly in `devDependencies` to protect `ts-node` compatibility.

### 2. ESM Module Types in CommonJS
- Never install legacy `@types/<package>` (e.g. `@types/file-type@10.x`) for packages that ship their own types via `"exports"`.
- Provide an ambient `.d.ts` declaration in `src/types/` when TypeScript's CommonJS module resolution fails to parse ESM `"exports"`.

### 3. AES-256-GCM Cryptographic Invariants
- `SECRET_KEY` must always be exactly 32 bytes (or 32 UTF-8 characters / 64 hex characters).
- `IV_LENGTH` must be 16 bytes.
- AES-256-GCM requires capturing `Encryption.getAuthTag()` during encryption and calling `DeCryption.setAuthTag(authTag)` before decrypting.

## Code Comment Conventions (TypeScript)

When writing or enhancing comments on TypeScript code in this project, always
follow these conventions:

### 1. Function / Method Documentation Block
Use a structured comment block above every function, method, or service handler:
```typescript
/**
 * FunctionName
 * Takes  : <parameter descriptions — name, type, and semantic meaning>
 * Does   : <numbered steps of the logic performed>
 * Returns: <return type + shape description>
 * Throws : <error class + condition that triggers it> (omit if no throws)
 */
```

### 2. Route Handler Header Block
Above each `router.METHOD(...)` call, add:
```typescript
// ─────────────────────────────────────────────────────────────────────────────
// HTTP_METHOD /route/path
// Auth  : <token type required>, Role: <Rolle.X>
// Takes : <request source (body/params/query) + field shapes>
// Does  : <summary of business logic>
// Returns: SuccessResponse<DTO> → <shape of the data field>
// ─────────────────────────────────────────────────────────────────────────────
```

### 3. Enum Members
Every enum member gets a trailing comment explaining its **semantic meaning**
and where/how it is used in the app:
```typescript
export enum download {
  True = "true",   // Content-Disposition: attachment — browser downloads file
  false = "false", // Content-Disposition: inline — browser renders/previews
}
```

### 4. DTO / Interface Fields
Every field in a type or interface gets a trailing comment explaining its
origin, what populates it, and how callers use it:
```typescript
export type UploadAssetDTO = {
  result: UpdateWriteOpResult; // MongoDB update operation result (modifiedCount etc.)
  Key: string;                 // S3 object key of the uploaded asset
};
```

### 5. Refactored Code
When a section of code was changed from one shape to another, explain the
change with a `// REFACTORED:` note and state WHY:
```typescript
// REFACTORED: was previously `{ Key: string }[]` — changed to `string[]`
// because S3service.DeleteAssets now handles the format conversion internally.
const Keys: string[] = ...
```

### 6. Multi-Step Function Bodies
Number each logical phase inside a function body:
```typescript
// step 1: <what this step does>
const foo = await ...;
// step 2: <what this step does>
const bar = await ...;
```

### 7. Import Lines
Add trailing comments to non-obvious imports:
```typescript
import { promisify } from "node:util";  // converts callback APIs → Promise-based
import { pipeline } from "node:stream"; // stream-pipe utility (callback-based)
```
