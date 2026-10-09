// ─────────────────────────────────────────────────────────────────────────────
// AWS.enum.ts
// Centralised enumerations for all AWS / S3 related constants.
// Import from this file instead of using raw strings to avoid typos and enable
// IDE auto-complete + compile-time safety.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AssetType
 * Identifies the logical category / sub-folder of an asset inside a user's S3 space.
 * Used in s3PathKeyPrefix() to build structured S3 object key paths:
 *   e.g. "User/<id>/Profile/<filename>" or "Post/<id>/attachments/<filename>"
 *
 * • Profile     : user profile / avatar image
 * • Cover       : user cover / banner image (large file)
 * • Images      : batch of images in a multi-file upload
 * • Docs        : document files (PDF, Word, etc.)
 * • attachments : files attached to comments or posts
 */
export enum AssetType {
  Profile = "Profile",
  Cover = "Cover",
  Images = "Images",
  Docs = "Docs",
  attachments = "attachments",
}

/**
 * FolderType
 * Top-level S3 folder that groups assets by entity type.
 * Used as the first path segment of every S3 object key:
 *   e.g. "User/<id>/..." or "Post/<id>/..."
 *
 * • User     : assets belonging to a user (profile photos, cover images)
 * • Post     : assets attached to a post
 * • Comments : assets attached to a comment
 */
export enum FolderType {
  User = "User",
  Post = "Post",
  Comments = "Comments",
}

/**
 * download
 * Controls the S3 / response Content-Disposition behaviour.
 * Sent as a query parameter (?download=true) by clients to force a file download
 * instead of inline rendering in the browser.
 *
 * • True  : "true"  → Content-Disposition: attachment (browser downloads the file)
 * • false : "false" → Content-Disposition: inline    (browser renders/previews the file)
 *
 * NOTE: This only affects behaviour in real browsers.
 *       API clients (Postman, Insomnia, etc.) ignore Content-Disposition.
 */
export enum download {
  True = "true",
  false = "false",
}
