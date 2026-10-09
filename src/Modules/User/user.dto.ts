// AWS SDK type for each entry in a bulk-delete result
import { DeletedObject } from "@aws-sdk/client-s3";
// Mongoose update operation result shape
import { UpdateWriteOpResult } from "mongoose";
// Zod used only for type inference from validation schemas
import z from "zod";
// Hydrated Mongoose user document type (with Mongoose instance methods)
import { HUserDocument } from "../../DB/models/User.model";
// Zod schemas whose inferred types are used as DTOs (avoids duplication)
import {
  AssignFcmTokenSchema,        // { body: { token: string } }
  RetrievePresignedURLSchema,  // { params: { path }, query: { filename, download, ContentType } }
} from "./user.validation";

// ─────────────────────────────────────────────────────────────────────────────
// ──── Upload endpoint OUTPUT types  (what the service returns to the controller)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UploadAssetDTO
 * Returned by AddUserPhoto and AddUserLargeFile.
 * • result : MongoDB update operation result (modifiedCount, etc.)
 * • Key    : the S3 object key string of the uploaded asset
 */
export type UploadAssetDTO = {
  result: UpdateWriteOpResult;
  Key: string;
};

/**
 * UploadAssetsDTO
 * Returned by AddMultiFiles.
 * • result : MongoDB update operation result
 * • Keys   : array of S3 object key strings (one per uploaded file)
 */
export type UploadAssetsDTO = {
  result: UpdateWriteOpResult;
  Keys: string[];
};

/**
 * PresignedUrlDTO
 * Returned by PresignedURL.
 * • payload.Key  : the S3 object key reserved for this upload slot
 * • payload.link : the time-limited pre-signed PUT URL the client must use
 * • result       : MongoDB update result from reserving the Key in CoverImage
 */
export type PresignedUrlDTO = {
  payload: {
    Key: string | undefined;
    link: string;
  };
  result: UpdateWriteOpResult;
};

/**
 * DeleteAssetDTO
 * Returned by DeleteUserAsset.
 * • result     : MongoDB update result ($pull from CoverImage)
 * • DeleteMark : Boolean from S3 DeleteMarker — true means the object was deleted
 */
export type DeleteAssetDTO = {
  result: UpdateWriteOpResult;
  DeleteMark: Boolean;
};

/**
 * DeleteAssetsDTO
 * Returned by DeleteUserAssets.
 * • result  : MongoDB update result ($pull + $in from CoverImage)
 * • Deleted : array of DeletedObject from S3 batch delete — one entry per deleted key
 */
export type DeleteAssetsDTO = {
  result: UpdateWriteOpResult;
  Deleted: DeletedObject[];
};

/**
 * FCM_TokenDTO
 * Returned by AssignFcmToken.
 * • result : MongoDB update result ($push to FCM_Token array)
 * • token  : the FCM device token string that was assigned
 */
export type FCM_TokenDTO = {
  result: UpdateWriteOpResult;
  token: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// ──── Upload endpoint INPUT types  (what the controller passes to the service)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AssetPayloadDTO
 * Input for AddUserPhoto and AddUserLargeFile.
 * • user : authenticated HUserDocument (provides user.id for S3 path)
 * • file : multer File object (either memory buffer or disk path depending on storage)
 */
export type AssetPayloadDTO = {
  user: HUserDocument;
  file: Express.Multer.File;
};

/**
 * AssetsPayloadDTO
 * Input for AddMultiFiles.
 * • user  : authenticated HUserDocument
 * • files : array of multer File objects (all in memory storage)
 */
export type AssetsPayloadDTO = {
  user: HUserDocument;
  files: Express.Multer.File[];
};

/**
 * AssetsPayloadPresignedUrlDTO
 * Input for PresignedURL — no file bytes; only metadata is needed to generate the URL.
 * • user         : authenticated HUserDocument (provides id for S3 path + DB update)
 * • ContentType  : MIME type the client will use when PUTting to the signed URL (e.g. "image/jpeg")
 * • Originalname : filename that forms part of the S3 object key
 */
export type AssetsPayloadPresignedUrlDTO = {
  user: HUserDocument;
  ContentType: string;
  Originalname: string;
};

/**
 * getUserAssetDTO
 * Output of getUserAsset service method and input shape for the controller
 * that streams it directly to the HTTP response.
 * • Body        : S3 GetObject streaming body (NodeJS.ReadableStream at runtime)
 * • ContentType : MIME type of the asset (e.g. "image/jpeg") — used for response headers
 */
export type getUserAssetDTO = {
  Body: unknown;                 // typed as unknown; controller casts to NodeJS.ReadableStream
  ContentType: string | undefined;
};

/**
 * Retrieve_PresignedURLDTO
 * Inferred from RetrievePresignedURLSchema.query — the validated query params shape.
 * • filename    : optional custom filename for Content-Disposition
 * • download    : "true" | "false" — forces browser download vs inline rendering
 * • ContentType : optional MIME type override; if undefined S3 forces download regardless
 */
export type Retrieve_PresignedURLDTO = z.infer<
  typeof RetrievePresignedURLSchema.query
>;

/**
 * Delete_AssetPayloadDTO
 * Input for DeleteUserAsset.
 * • user : authenticated HUserDocument (for DB $pull update)
 * • Key  : exact S3 object key string to delete
 */
export type Delete_AssetPayloadDTO = {
  user: HUserDocument;
  Key: string;
};

/**
 * Delete_AssetsPayloadDTO
 * Input for DeleteUserAssets.
 * • user : authenticated HUserDocument (for DB $pull + $in update)
 * • Keys : array of exact S3 object key strings to batch-delete
 */
export type Delete_AssetsPayloadDTO = {
  user: HUserDocument;
  Keys: string[];
};

/**
 * DeleteUserProfileDTO
 * Returned by DeleteUserProfile.
 * • DeletedUser   : the Mongoose document of the deleted user
 * • DeletedAssets : S3 batch-delete results (or undefined if user had no assets)
 */
export type DeleteUserProfileDTO = {
  DeletedUser: HUserDocument;
  DeletedAssets: DeletedObject[] | DeletedObject | undefined;
};

/**
 * FCM_TokenPayloadDTO
 * Input type for AssignFcmToken — inferred directly from AssignFcmTokenSchema.body.
 * Shape: { token: string }
 * Using Zod inference avoids keeping a manually maintained duplicate type.
 */
export type FCM_TokenPayloadDTO = z.infer<typeof AssignFcmTokenSchema.body>;

/**
 * SendNotificationPayloadDTO
 * Input for SendNotification.
 * • user : authenticated HUserDocument (FCM_Token array is read from here)
 * • data : notification content — { title: string, body: string }
 */
export type SendNotificationPayloadDTO = {
  user: HUserDocument;
  data: { title: string; body: string };
};
