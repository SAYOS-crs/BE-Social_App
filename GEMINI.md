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
