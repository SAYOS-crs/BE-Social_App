"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteUserAssetsSchema = exports.DeleteUserAssetSchema = exports.SendNotificationSchema = exports.AssignFcmTokenSchema = exports.RetrievePresignedURLSchema = exports.getUserAssetSchema = exports.PresignedURLSchema = exports.AddMultiFilesSchema = exports.addUserLargeFileSchema = exports.addUserPhotoSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const Utils_1 = require("../../Utils");
exports.addUserPhotoSchema = {
    body: zod_1.default.strictObject({
        file: Utils_1.GeneralFields.file(Utils_1.AllowedFileTypes.photo),
    }),
};
exports.addUserLargeFileSchema = {
    body: zod_1.default.strictObject({
        file: Utils_1.GeneralFields.file(Utils_1.AllowedFileTypes.photo),
    }),
};
exports.AddMultiFilesSchema = {
    body: zod_1.default.strictObject({
        files: zod_1.default.array(Utils_1.GeneralFields.file(Utils_1.AllowedFileTypes.photo)),
    }),
};
exports.PresignedURLSchema = {
    body: zod_1.default.strictObject({
        ContentType: zod_1.default.string(),
        Originalname: zod_1.default.string(),
    }),
};
exports.getUserAssetSchema = {
    params: zod_1.default.strictObject({
        path: Utils_1.GeneralFields.path,
    }),
    query: zod_1.default.strictObject({
        filename: Utils_1.GeneralFields.filename.optional(),
        download: Utils_1.GeneralFields.download.optional(),
    }),
};
exports.RetrievePresignedURLSchema = {
    params: zod_1.default.strictObject({
        path: Utils_1.GeneralFields.path,
    }),
    query: zod_1.default.strictObject({
        filename: Utils_1.GeneralFields.filename.optional(),
        download: Utils_1.GeneralFields.download.optional(),
        ContentType: Utils_1.GeneralFields.ContentType.optional(),
    }),
};
exports.AssignFcmTokenSchema = {
    body: zod_1.default.strictObject({
        token: Utils_1.GeneralFields.Token,
    }),
};
exports.SendNotificationSchema = {
    body: zod_1.default.strictObject({
        title: Utils_1.GeneralFields.Notification_title,
        body: Utils_1.GeneralFields.Notification_body,
    }),
};
exports.DeleteUserAssetSchema = {
    body: zod_1.default.strictObject({
        Key: Utils_1.GeneralFields.Key,
    }),
};
exports.DeleteUserAssetsSchema = {
    body: zod_1.default.strictObject({
        Keys: zod_1.default.array(Utils_1.GeneralFields.Key),
    }),
};
