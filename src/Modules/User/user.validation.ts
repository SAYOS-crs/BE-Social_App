import z from "zod";
// General reusable Zod fields shared across all modules (id, email, file, path, etc.)
import { AllowedFileTypes, GeneralFields } from "../../Utils";

// ─────────────────────────────────────────────────────────────────────────────
// addUserPhotoSchema
// Used by: PATCH /user/addUserPhoto
// Takes  : req.body (after Validation middleware reverses req.file → req.body.file)
// Validates: a single file with MIME type in AllowedFileTypes.photo
//            ("image/jpg" | "image/png" | "image/jpeg" | "image/webp")
// ─────────────────────────────────────────────────────────────────────────────
export const addUserPhotoSchema = {
  body: z.strictObject({
    file: GeneralFields.file(AllowedFileTypes.photo), // validates multer single-file object shape + MIME type
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// addUserLargeFileSchema
// Used by: PUT /user/addUserLargeFile
// Takes  : req.body (after Validation middleware reverses req.file → req.body.file)
// Validates: a single file (disk storage — has .path + .destination + .filename)
//            with MIME type in AllowedFileTypes.photo
// ─────────────────────────────────────────────────────────────────────────────
export const addUserLargeFileSchema = {
  body: z.strictObject({
    file: GeneralFields.file(AllowedFileTypes.photo), // same file shape; path/destination/filename optional fields are covered
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// AddMultiFilesSchema
// Used by: PUT /user/AddMultiFiles
// Takes  : req.body (after Validation middleware reverses req.files → req.body.files)
// Validates: an array of up to 3 file objects, each with allowed photo MIME type
// ─────────────────────────────────────────────────────────────────────────────
export const AddMultiFilesSchema = {
  body: z.strictObject({
    files: z.array(GeneralFields.file(AllowedFileTypes.photo)), // array of validated multer file objects
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// PresignedURLSchema
// Used by: GET /user/PresignedURL
// Takes  : req.body (no file — only metadata needed to generate the signed URL)
// Validates:
//   • ContentType  : MIME type the client will use when PUTting to S3 (e.g. "image/jpeg")
//   • Originalname : filename used to construct the S3 object key path
// ─────────────────────────────────────────────────────────────────────────────
export const PresignedURLSchema = {
  body: z.strictObject({
    ContentType: z.string(),  // must be a non-empty string (no further format check here)
    Originalname: z.string(), // original filename from the client
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// getUserAssetSchema
// Used by: GET /user/GetUserAsset/*path
// Takes  : req.params + req.query
// Validates:
//   params.path    : wildcard array of path segments that form the S3 key
//   query.filename : optional custom filename for Content-Disposition header
//   query.download : optional "true" | "false" flag to force browser download
// ─────────────────────────────────────────────────────────────────────────────
export const getUserAssetSchema = {
  params: z.strictObject({
    path: GeneralFields.path, // z.array(z.string()) — Express splits wildcard into segments
  }),
  query: z.strictObject({
    filename: GeneralFields.filename.optional(), // custom download filename (optional)
    download: GeneralFields.download.optional(), // "true" | "false" from AwsEnum.download (optional)
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// RetrievePresignedURLSchema
// Used by: GET /user/RetrievePresignedURL/*path
// Takes  : req.params + req.query
// Validates:
//   params.path       : wildcard S3 key segments
//   query.filename    : optional filename for Content-Disposition
//   query.download    : optional "true" | "false" download flag
//   query.ContentType : optional MIME override; if missing S3 forces download regardless
// ─────────────────────────────────────────────────────────────────────────────
export const RetrievePresignedURLSchema = {
  params: z.strictObject({
    path: GeneralFields.path,
  }),
  query: z.strictObject({
    filename: GeneralFields.filename.optional(),    // optional — falls back to last path segment
    download: GeneralFields.download.optional(),    // optional — controls inline vs attachment disposition
    ContentType: GeneralFields.ContentType.optional(), // optional — if undefined S3 forces download anyway
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// AssignFcmTokenSchema
// Used by: POST /user/AssignFcmToken
// Takes  : req.body
// Validates: { token: string } — the FCM device registration token (must be non-empty)
// ─────────────────────────────────────────────────────────────────────────────
export const AssignFcmTokenSchema = {
  body: z.strictObject({
    token: GeneralFields.Token, // z.string().min(1) — non-empty FCM token string
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// SendNotificationSchema
// Used by: POST /user/SendNotification
// Takes  : req.body
// Validates:
//   • title : string (5–20 chars) — notification title shown in the push banner
//   • body  : string (10–50 chars) — notification body text
// ─────────────────────────────────────────────────────────────────────────────
export const SendNotificationSchema = {
  body: z.strictObject({
    title: GeneralFields.Notification_title, // z.string().min(5).max(20)
    body: GeneralFields.Notification_body,   // z.string().min(10).max(50)
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// DeleteUserAssetSchema
// Used by: DELETE /user/DeleteUserAsset
// Takes  : req.body
// Validates: { Key: string } — the exact S3 object key to delete
// ─────────────────────────────────────────────────────────────────────────────
export const DeleteUserAssetSchema = {
  body: z.strictObject({
    Key: GeneralFields.Key, // z.string() — the full S3 object key (e.g. "User/abc/Profile/photo.jpg")
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// DeleteUserAssetsSchema
// Used by: DELETE /user/DeleteUserAssets
// Takes  : req.body
// Validates: { Keys: string[] } — array of S3 object keys to bulk-delete
// ─────────────────────────────────────────────────────────────────────────────
export const DeleteUserAssetsSchema = {
  body: z.strictObject({
    Keys: z.array(GeneralFields.Key), // array of z.string() — at least one key required by convention
  }),
};
