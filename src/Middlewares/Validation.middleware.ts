// Express middleware types used by both Validation() and GqlValidation()
import { NextFunction, Request, Response } from "express";
// GraphQLError used to throw properly formatted validation errors in GraphQL resolvers
import { GraphQLError } from "graphql";
// Lightweight console.log alias (used in GqlValidation for debug output)
import { log } from "node:console";
// Zod core types:
//   ZodType   → base type for all Zod schemas (used in the ValidationSchema index signature)
//   ZodError  → Zod's structured error type (contains .issues array)
import z, { ZodError, ZodType } from "zod";
// ConflictExption: 409-level error used to surface Zod validation failures to REST clients
import { ConflictExption } from "../Utils";

// ─────────────────────────────────────────────────────────────────────────────
// ValidationSchema
// An index-signature type that maps any string key to a Zod schema.
// Callers pass an object whose keys match Express request parts:
//   { body: z.object({...}), params: z.object({...}), query: z.object({...}) }
// Each value is validated against the corresponding req[key] segment.
// ─────────────────────────────────────────────────────────────────────────────
interface ValidationSchema {
  [key: string]: ZodType; // key = "body" | "params" | "query" | any request segment
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation (default export)
// Takes  : schema — a ValidationSchema object with Zod schemas per request segment
// Does   :
//   ── File Reverser ──
//   Before running Zod validation, the middleware "reverses" multer files back into
//   req.body so Zod can see and validate them as regular body fields:
//     • req.files → req.body.files  (multi-file upload via .array())
//     • req.file  → req.body.file   (single-file upload via .single())
//   ──────────────────
//   Then iterates over each key in the schema object, skips falsy schemas,
//   and calls schema[key].safeParse(req[key]).
//   Collects ALL Zod errors across all segments (body + params + query).
//   If any errors were found, throws a ConflictExption(409) with all issues.
//   Otherwise calls next() to pass control to the route handler.
// Returns: void — calls next() on success; throws ConflictExption on failure
// ─────────────────────────────────────────────────────────────────────────────
export default function Validation(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    // accumulates ZodError objects from every failing schema segment
    const ErrorResults: ZodError[] = [];

    // ────────────────────────────────────────────────────────────────────────
    // ------------< File Reverser >------------\\
    // multer stores uploaded files in req.files or req.file — NOT in req.body.
    // Since Zod validates req.body, we copy the file reference(s) into req.body
    // so the file schema (GeneralFields.file()) can validate them.
    if (req.files) {
      // multi-file upload: assign the files array to req.body.files
      req.body.files = req.files;
      console.log("files(multi) Reverser to body :", req.body); // debug
    } else if (req.file) {
      // single-file upload: assign the file object to req.body.file
      req.body.file = req.file;
      console.log("file(singel) Reverser to body :", req.body); // debug
    }
    // ------------------------------------------\\

    // iterate over each schema key (e.g. "body", "params", "query")
    for (const key of Object.keys(schema)) {
      // skip any schema entry that is falsy / undefined (optional schema segments)
      if (!schema[key]) continue;

      // validate the corresponding request segment against its Zod schema
      // req[key as keyof Request] accesses req.body | req.params | req.query dynamically
      const result = schema[key].safeParse(req[key as keyof Request]);

      // collect the ZodError if validation failed (safeParse never throws)
      if (!result.success) {
        ErrorResults.push(result.error);
      }
    }

    // if any segment failed, throw a single 409 error with all issues combined
    if (ErrorResults.length) {
      throw new ConflictExption(
        "Validation Error",
        ErrorResults.map((e) => {
          return e.issues; // extract the array of ZodIssue objects for each segment
        }),
      );
    }

    next(); // all segments passed — continue to the next middleware or route handler
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GqlValidation
// Takes  : schema — a Zod schema (z.ZodType) to validate against
//           data   — the raw input value to validate (T — generic for flexibility)
// Does   : runs Zod safeParse on the provided data;
//          logs the result for debug visibility in GraphQL context;
//          throws a GraphQLError with the Zod issues as the `cause` if invalid
// Returns: void — returns nothing on success; throws GraphQLError on failure
// Usage  : call inside GraphQL resolvers before processing arguments:
//          GqlValidation(createPostSchema, args)
// ─────────────────────────────────────────────────────────────────────────────
export function GqlValidation<T>(schema: z.ZodType, data: T): void | never {
  // run Zod validation — safeParse never throws; result.success tells us the outcome
  const result = schema.safeParse(data);
  log("GraphQL Validation Result :", result); // debug: always log result in GQL context
  if (!result.success) {
    // throw a GraphQLError so Apollo/the GQL engine formats it correctly in the response
    throw new GraphQLError("Validation error", { cause: result.error.issues });
  }

  return; // explicit void return for clarity
}
