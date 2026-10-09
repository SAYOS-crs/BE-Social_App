// Express types used throughout all guard functions
import { Request } from "express";
// Hydrated Mongoose user document type (returned by guards that retrieve the user)
import { HUserDocument } from "../../DB/models/User.model";
// Error factories for guard failures
import { BadRequstExption, UnAuthroizedExption } from "../response";

// ─────────────────────────────────────────────────────────────────────────────
// GetAuthenticatedUser
// Takes  : req — Express Request object (populated by Authentication middleware)
// Does   : asserts that req.user was set by the JWT Authentication middleware
// Returns: HUserDocument — the authenticated user's Mongoose hydrated document
// Throws : UnAuthroizedExption (401) if req.user is undefined/null
// ─────────────────────────────────────────────────────────────────────────────
export const GetAuthenticatedUser = (req: Request): HUserDocument => {
  // if Authentication middleware didn't run or the token was invalid, req.user will be missing
  if (!req.user) {
    throw new UnAuthroizedExption("User is not authenticated");
  }
  return req.user; // return the hydrated Mongoose user document
};

// ─────────────────────────────────────────────────────────────────────────────
// CheckConfiremEmail
// Takes  : confirmEmail — the user's email confirmation timestamp (from user doc)
// Does   : asserts that the user has confirmed their email address
// Returns: true (Boolean) if the email is confirmed
// Throws : UnAuthroizedExption (401) if confirmEmail is undefined (not yet confirmed)
// ─────────────────────────────────────────────────────────────────────────────
export const CheckConfiremEmail = (
  confirmEmail: Date | undefined,
): Boolean | never => {
  // undefined means the user never clicked the confirmation link
  if (!confirmEmail) {
    throw new UnAuthroizedExption("Email not Confirmed !");
  }
  return true; // email is confirmed — allow the request to proceed
};

// ─────────────────────────────────────────────────────────────────────────────
// -----------< files guard >-----------\\
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GetAuthorizedFile
// Takes  : req — Express Request after multer .single() middleware has run
// Does   : asserts that multer placed a file in req.file (single-file upload)
// Returns: Express.Multer.File — the validated single uploaded file object
//          (contains .buffer for memory storage, or .path for disk storage)
// Throws : BadRequstExption (400) if req.file is missing (no file was uploaded)
// ─────────────────────────────────────────────────────────────────────────────
export const GetAuthorizedFile = (req: Request): Express.Multer.File => {
  // req.file is set by multer's .single() — if it's falsy the client sent no file
  if (!req.file) {
    throw new BadRequstExption("file is missing !");
  }

  return req.file; // the validated multer file object
};

// ─────────────────────────────────────────────────────────────────────────────
// GetAuthorizedMultiFiles
// Takes  : req — Express Request after multer .array() middleware has run
// Does   : asserts that multer placed files in req.files (multi-file upload)
// Returns: Express.Multer.File[] — array of validated uploaded file objects
// Throws : BadRequstExption (400) if req.files is missing/empty (no files uploaded)
// ─────────────────────────────────────────────────────────────────────────────
export const GetAuthorizedMultiFiles = (
  req: Request,
): Express.Multer.File[] => {
  // req.files is set by multer's .array() — falsy means the client sent no files
  if (!req.files) {
    throw new BadRequstExption("file not receved !");
  }
  // cast to Express.Multer.File[] (multer types req.files as a union including object form)
  return req.files as Express.Multer.File[];
};

// ─────────────────────────────────────────────────────────────────────────────
// ---------------< aws s3 >----------------\\
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// S3_RetrieveKeyFromParams
// Takes  : req — Express Request with a wildcard route param named "path"
//          (e.g. route "/GetUserAsset/*path" → req.params.path = ["folder","sub","file.jpg"])
// Does   : reads the wildcard path-segment array from req.params and joins them
//          with "/" to reconstruct the full S3 object key string
// Returns: { Key: string, path: string[] }
//   • Key  : full S3 object key (e.g. "User/abc123/Profile/photo.jpg")
//   • path : raw array of segments (used for deriving the fallback filename)
// ─────────────────────────────────────────────────────────────────────────────
export const S3_RetrieveKeyFromParams = (
  req: Request,
): { Key: string; path: string[] } => {
  // Express stores the wildcard path segments as an array in req.params.path
  const { path } = req.params as { path: string[] };
  // join the segments with "/" to form the complete S3 object key
  const Key = path.join("/");
  return { Key, path }; // both are returned so callers can use the array for filename derivation
};
