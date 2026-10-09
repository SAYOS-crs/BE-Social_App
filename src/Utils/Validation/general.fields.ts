// Mongoose Types used for ObjectId validation
import { Types } from "mongoose";
// Zod — the primary runtime validation library used across all modules
import * as z from "zod";
// Application enums used in Zod schemas for type-safe enum validation
import { AwsEnum, PostEnum } from "../Enums";

/**
 * GeneralFields
 * A centralized collection of reusable Zod field schemas shared across all modules.
 * Import individual fields from here to compose schemas instead of duplicating logic.
 *
 * ─── Usage pattern ───────────────────────────────────────────────────────────
 * import { GeneralFields } from "../../Utils";
 * const mySchema = { body: z.strictObject({ email: GeneralFields.Email }) };
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const GeneralFields = {
  // ── id ────────────────────────────────────────────────────────────────────
  // Takes : a string value from the request (e.g. req.params.id or req.body.id)
  // Does  : validates it's a string, then checks it's a valid MongoDB ObjectId format
  // Returns: the original string (not transformed) if valid; Zod error otherwise
  id: z
    .string()
    .refine((v) => Types.ObjectId.isValid(v), { error: "id in not valid" }),

  // ── Email ─────────────────────────────────────────────────────────────────
  // Takes : raw email string from request body
  // Does  : validates RFC email format, enforces 9–35 character length,
  //         trims whitespace, and normalises to lowercase
  // Returns: trimmed lowercased email string
  Email: z
    .string({ message: "Email is required" })
    .email("Invalid email format")
    .max(35, "Email must be at most 35 characters")
    .min(9, "Email must be at least 9 characters")
    .trim()
    .toLowerCase(),

  // ── Password ──────────────────────────────────────────────────────────────
  // Takes : raw password string from request body
  // Does  : enforces 8–20 character length (no format restrictions beyond length)
  // Returns: the original string if valid
  Password: z
    .string({ message: "Password is required" })
    .max(20, "Password must be at most 20 characters")
    .min(8, "Password must be at least 8 characters"),

  // ── Token ─────────────────────────────────────────────────────────────────
  // Takes : any token string (JWT, FCM token, verification token, etc.)
  // Does  : ensures the string is non-empty
  // Returns: the token string if valid
  Token: z
    .string({ message: "Token is required" })
    .min(1, "Token must not be empty"),

  // ── OTP ───────────────────────────────────────────────────────────────────
  // Takes : one-time password string from request body
  // Does  : validates exactly 6 characters (numeric OTPs are sent as strings)
  // Returns: the 6-character string if valid
  OTP: z
    .string({ message: "OTP is required" })
    .length(6, "OTP must be exactly 6 characters"),

  // ── content ───────────────────────────────────────────────────────────────
  // Takes : any string (post or comment text content)
  // Does  : basic string presence check (no min/max here — callers add if needed)
  content: z.string(),

  // ── visibility ────────────────────────────────────────────────────────────
  // Takes : a visibility string value (e.g. "public" | "friends" | "private")
  // Does  : restricts the value to the PostEnum.VisibilityEnum members
  // Returns: the validated visibility string
  visibility: z.enum(PostEnum.VisibilityEnum),

  // ── fileId ────────────────────────────────────────────────────────────────
  // Takes : a string identifier for a file/attachment folder in S3
  // Does  : basic string validation (no format restriction; UUIDs are typical)
  fileId: z.string(),

  // ── tags ──────────────────────────────────────────────────────────────────
  // Takes : either a single user ID string OR an array of user ID strings
  // Does  : accepts both forms because HTML forms send single values as strings
  //         but JSON bodies may send arrays.
  // FIX   : previously expected array only — caused validation errors on single-tag forms
  tags: z.union([z.array(z.string()), z.string()]),

  // ── likes ─────────────────────────────────────────────────────────────────
  // Same rationale as tags — accepts string | string[] for compatibility
  likes: z.union([z.array(z.string()), z.string()]),

  // ── page ──────────────────────────────────────────────────────────────────
  // Takes : query param value (may arrive as a string from URL query string)
  // Does  : coerces to number (so "2" → 2) and marks optional for pagination
  page: z.coerce.number().optional(),

  // ── limit ─────────────────────────────────────────────────────────────────
  // Takes : query param value (may arrive as a string)
  // Does  : coerces to number and marks optional for pagination
  limit: z.coerce.number().optional(),

  // ── file ──────────────────────────────────────────────────────────────────
  // Takes : mimtype — string[] of allowed MIME types (e.g. AllowedFileTypes.photo)
  // Does  : returns a Zod strictObject schema that validates a multer File object.
  //         Handles BOTH storage strategies:
  //           • Memory storage → .buffer is defined, .path/.destination/.filename are undefined
  //           • Disk storage   → .path/.destination/.filename are defined, .buffer is undefined
  //         The superRefine cross-check enforces that at least one of (path | buffer) exists,
  //         preventing "empty" file objects from passing validation.
  // Returns: a Zod schema (not a value) — call as GeneralFields.file(mimeList)
  file: function (mimtype: string[]) {
    return z
      .strictObject({
        fieldname: z.string(),    // multer field name (e.g. "photo", "LargeFile")
        originalname: z.string(), // original filename from the client
        encoding: z.string(),     // file encoding (e.g. "7bit")
        mimetype: z.enum(mimtype, { error: "file type not allowed" }), // MIME type constrained to allowed list
        // buffer for memory storage (MemoryStorage) — undefined when using DiskStorage
        buffer: z.any().optional(),
        // destination + filename for disk storage (DiskStorage / tmp folder)
        destination: z.string().optional(), // temp directory path on the server
        filename: z.string().optional(),    // temp filename assigned by multer on disk
        path: z.string().optional(),        // full temp file path (destination + "/" + filename)
        size: z.number(),                   // file size in bytes
      })
      .superRefine((values, ctx) => {
        // cross-field validation: at least one of path (disk) or buffer (memory) must be present
        if (!values.path && !values.buffer) {
          ctx.addIssue({
            code: "custom",
            path: ["path", "buffer"],
            message: `there is not path or buffer from file }`,
          });
        }
      });
  },

  // ── react ─────────────────────────────────────────────────────────────────
  // Takes : reaction number (may come as a string from URL query; coerced to number)
  // Does  : coerces string → number, then refines to ensure the value is one of
  //         the PostEnum.PostReactEnum numeric values (e.g. 1=Like, 2=Love, etc.)
  // Returns: the coerced number if valid; Zod error otherwise
  react: z.coerce.number().refine(
    (v) => {
      // this is how to make sure react number is in the enum of reacts
      return Object.values(PostEnum.PostReactEnum).includes(Number(v));
    },
    { error: "react number not valid" },
  ),

  // ─── AWS / S3 fields ──────────────────────────────────────────────────────
  // NOTE: These fields may benefit from additional format validation in a future enhance.

  // Key — the exact S3 object key string (e.g. "User/abc/Profile/photo.jpg")
  Key: z.string(),

  // ContentType — MIME type string the client sends for presigned URL generation
  ContentType: z.string(),

  // Originalname — the original filename used to build the S3 object key path
  Originalname: z.string(),

  // filename — optional custom filename used in Content-Disposition response headers
  filename: z.string(),

  // download — "true" | "false" enum enforced from AwsEnum.download
  // Controls whether the browser treats the response as inline or as a file download
  download: z.enum(AwsEnum.download),

  // path — wildcard route path segments array (e.g. ["User","abc","Profile","photo.jpg"])
  // Express stores wildcard "*path" params as an array; Zod validates each segment as a string
  path: z.array(z.string()),

  // ─── Notification fields ──────────────────────────────────────────────────
  // Notification_title — push notification title: min 5, max 20 characters
  Notification_title: z.string().min(5).max(20),

  // Notification_body — push notification body text: min 10, max 50 characters
  Notification_body: z.string().min(10).max(50),
};
