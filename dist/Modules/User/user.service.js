"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const User_Repository_1 = __importDefault(require("../../DB/Repository/User.Repository"));
const Utils_1 = require("../../Utils");
// ------------------ tools ---------------\\
// - S3_ReadStream = transform pipeline from callback to async
const node_util_1 = require("node:util");
const node_stream_1 = require("node:stream");
const node_console_1 = require("node:console");
const S3_ReadStream = (0, node_util_1.promisify)(node_stream_1.pipeline);
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// -
const S3_RetrieveKeyFromParams = (req) => {
    const { path } = req.params;
    const Key = path.join("/");
    return { Key, path };
};
// -----------------------------------------\\
class UserService {
    _NotificationService = Utils_1.NotificationService;
    _UserRepository = new User_Repository_1.default();
    _AWS_S3 = Utils_1.AWS_SERVICE.S3service;
    constructor() { }
    _GetAuthenticatedUser = (req) => {
        if (!req.user) {
            throw new Utils_1.UnAuthroizedExption("User is not authenticated");
        }
        return req.user;
    };
    _GetAuthorizedFile = (req) => {
        if (!req.file) {
            throw new Utils_1.BadRequstExption("file not receved !");
        }
        return req.file;
    };
    _GetAuthorizedMultiFiles = (req) => {
        if (!req.files) {
            throw new Utils_1.BadRequstExption("file not receved !");
        }
        return req.files;
    };
    // ---------------------------------------- routers ----------------------------------------\\
    GetUserProfile = async (req, res) => {
        const user = this._GetAuthenticatedUser(req);
        return (0, Utils_1.SuccessResponse)({ res, message: "good", data: user });
    };
    DeleteUserProfile = async (req, res) => {
        const user = this._GetAuthenticatedUser(req);
        // step 1 : delete user
        const DeletedUser = await this._UserRepository.DeleteOne({ _id: user._id });
        let DeletedAssets;
        // step 2 : check if the user have assets / true = delete this assets using DeleteAssetsByPrefix form aws
        if (DeletedUser.CoverImage?.length || DeletedUser.UserImage) {
            DeletedAssets = await this._AWS_S3.DeleteAssetsByPrefix({
                folder: "User",
                id: user.id,
            });
        }
        console.log(DeletedAssets);
        // step 3 :return deleted user and assets
        return (0, Utils_1.SuccessResponse)({
            res,
            message: "User Deleted successfly",
            data: { DeletedUser, DeletedAssets },
        });
    };
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ---------------------------------------- Upload Assets ----------------------------------------
    AddUserPhoto = async (req, res) => {
        const user = this._GetAuthenticatedUser(req);
        const file = this._GetAuthorizedFile(req);
        // -------------------------------------------------------
        console.log(file);
        const Key = await this._AWS_S3.UploadFile({
            file,
            path: (0, Utils_1.s3PathKeyPrefix)({
                AssetType: Utils_1.AwsEnum.AssetType.Profile,
                file,
                folder: Utils_1.AwsEnum.FolderType.User,
                id: user.id,
            }),
        });
        console.log(file.mimetype, file.originalname);
        if (!Key)
            throw new Utils_1.BadRequstExption("Error while Uploading Asset to AWS Service !");
        console.log(Key);
        // -------------------------------------------------------
        const result = await this._UserRepository.updateOne({
            filter: { _id: user._id },
            update: { UserImage: Key },
        });
        if (!result)
            throw new Utils_1.BadRequstExption("error while setting user photo");
        return (0, Utils_1.SuccessResponse)({ res, message: "done", data: result });
    };
    // ------------------------------------------------------------------------------------------------
    AddUserLargeFile = async (req, res) => {
        // 1. get the User
        const user = this._GetAuthenticatedUser(req);
        // 2. get the file
        const file = this._GetAuthorizedFile(req);
        // -------------------------------------------------------------
        // 3. send file by aws Service / UploadLargeFiles
        const Key = await this._AWS_S3.UploadLargeFiles({
            file: file,
            path: (0, Utils_1.s3PathKeyPrefix)({
                AssetType: Utils_1.AwsEnum.AssetType.Cover,
                file: file,
                folder: Utils_1.AwsEnum.FolderType.User,
                id: user.id,
            }),
            ContentType: file.mimetype,
            StorageAprotche: Utils_1.StorageAprotches.Disk,
        });
        if (!Key) {
            throw new Utils_1.BadRequstExption("Key form aws is missing !");
        }
        // --------------------------------------------------------------
        // 4. send the Key form AWS to User CoverImage
        const result = await this._UserRepository.updateOne({
            filter: { _id: user._id },
            update: { $push: { CoverImage: Key } },
        });
        if (!result) {
            throw new Utils_1.BadRequstExption("Error while Updating User CoverImage!");
        }
        return (0, Utils_1.SuccessResponse)({ res, message: "done", data: result });
    };
    // ------------------------------------------------------------------------------------------------
    AddMultiFiles = async (req, res) => {
        const user = this._GetAuthenticatedUser(req);
        const files = this._GetAuthorizedMultiFiles(req);
        // call the s3
        const Keys = await this._AWS_S3.UploadMultiFiles({
            files,
            AssetType: Utils_1.AwsEnum.AssetType.Images,
            folder: Utils_1.AwsEnum.FolderType.User,
            id: user.id,
        });
        if (!Keys) {
            throw new Utils_1.BadRequstExption("there is not Keys form s3");
        }
        const result = await this._UserRepository.updateOne({
            filter: { _id: user._id },
            update: { $push: { CoverImage: Keys } },
        });
        if (!result) {
            throw new Utils_1.BadRequstExption("Error while adding Keys form s3 to user");
        }
        return (0, Utils_1.SuccessResponse)({ res, message: "done", data: result });
    };
    // ------------------------------------------------------------------------------------------------
    PresignedURL = async (req, res) => {
        /**
         * Generates a temporary Presigned URL for direct client-to-S3 uploads.
         *
         * WORKFLOW STEPS:
         * 1. Extract authenticated user context from token/session.
         * 2. Receive file metadata (`ContentType`, `Originalname`) from request body.
         * 3. Request S3 service to generate a signed PUT URL for the designated path.
         * 4. Record/reserve the S3 object Key in the user database record.
         * 5. Respond to client with `{ link, Key }` so client can PUT raw file to S3.
         */
        // STEP 1: Get the authenticated user ID
        const user = this._GetAuthenticatedUser(req);
        // STEP 2: Extract file metadata provided by client (no binary payload here)
        const { ContentType, Originalname } = req.body;
        // STEP 3: Generate the time-limited presigned S3 PUT URL and object Key
        const payload = await this._AWS_S3.Upload_PresignedURL({
            AssetType: "Profile",
            ContentType,
            Originalname,
            folder: Utils_1.AwsEnum.FolderType.User,
            id: user.id,
        });
        // STEP 4: Store S3 Key in the database to link asset to the user profile
        const result = await this._UserRepository.updateOne({
            filter: { _id: user._id },
            update: { $push: { CoverImage: payload.Key } },
        });
        // STEP 5: Send response containing `{ link, Key }` to client for direct upload
        return (0, Utils_1.SuccessResponse)({ res, data: { payload, result } });
    };
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ---------------------------------- Retrieve & Download Assets ----------------------------------\\
    getUserAsset = async (req, res) => {
        const { filename, download } = req.query;
        // 1. get assets key form params : its come sapert apart so its must join them.
        const { path, Key } = S3_RetrieveKeyFromParams(req);
        // */*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/---------------------------
        // 2. get the assets by Key , and distruct the body , the body is stream data
        const { Body, ContentType } = await this._AWS_S3.RetrieveAsset({ Key });
        // */*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/---------------------------
        // 3. set the headers
        // - cors header
        res.set("Cross-Origin-Resource-Policy", "cross-origin");
        // - download header if true it will download the assets
        if (download == "true") {
            (0, node_console_1.log)("file downloading ...");
            // - Content-type header
            res.setHeader("Content-Type", ContentType || "application/octet-stream");
            res.setHeader("Content-Disposition", `attachment; filename="${filename || path[path.length - 1]}"`);
        }
        // */*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/---------------------------
        // 4. using S3_ReadStream method we created bass it the stream as ReadableStream and the distnation and will be Response and its automatic detect the res.pip and pass the stream when finish to it.
        S3_ReadStream(Body, res);
        // return SuccessResponse({ res, message: "done", data: result });
    };
    // ------------------------------------------------------------------------------------------------
    Retrieve_PresignedURL = async (req, res) => {
        const { filename, download, ContentType } = req.query;
        console.log(filename, download, ContentType);
        // note : ContentType is optional becz if its = undefined that will mean download it anyway even if download= false,
        const { path, Key } = S3_RetrieveKeyFromParams(req);
        const Link = await this._AWS_S3.Retrieve_PresignedURL({
            Key,
            path,
            filename,
            download,
            ContentType,
        });
        return (0, Utils_1.SuccessResponse)({ res, message: "done", data: { Link } });
    };
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------- Delete Assets -------------------------------------------\\
    Delete_Asset = async (req, res) => {
        const user = this._GetAuthenticatedUser(req);
        const { Key } = req.body;
        const DeleteMark = await this._AWS_S3.DeleteAsset({ Key });
        console.log({ DeleteMark });
        if (!DeleteMark) {
            throw new Utils_1.BadRequstExption("Error while Deleting Asset From AWS S3 User Bucket");
        }
        const result = await this._UserRepository.updateOne({
            filter: { _id: user._id },
            update: { $pull: { CoverImage: Key } },
        });
        return (0, Utils_1.SuccessResponse)({
            res,
            message: "done",
            data: { result, DeleteMark },
        });
    };
    // ------------------------------------------------------------------------------------------------
    Delete_Assets = async (req, res) => {
        const user = this._GetAuthenticatedUser(req);
        const { Keys } = req.body;
        if (!Array.isArray(Keys)) {
            throw new Utils_1.BadRequstExption("Keys must be an Array");
        }
        const ArrayOfKeys = Keys.map((k) => {
            return { Key: k };
        });
        console.log(ArrayOfKeys);
        const Deleted = await this._AWS_S3.DeleteAssets({
            Keys: ArrayOfKeys,
        });
        console.log({ Deleted });
        Deleted.map((d) => {
            if (!d.DeleteMarker) {
                throw new Utils_1.BadRequstExption(`Error while Deleting Asset From AWS S3 User Bucket , Key that cause Error : ${d.Key} `);
            }
        });
        const result = await this._UserRepository.updateOne({
            filter: { _id: user._id },
            update: { $pull: { CoverImage: { $in: Keys } } },
        });
        return (0, Utils_1.SuccessResponse)({ res, message: "done", data: { result, Deleted } });
    };
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ---------------------------------------- notifications -----------------------------------------\\
    GetFCM_Token = async (req, res) => {
        const user = this._GetAuthenticatedUser(req);
        const { token } = req.body;
        const { id, FCM_Token } = user;
        if (FCM_Token?.includes(token)) {
            throw new Utils_1.ConflictExption("token already assigned !");
        }
        const result = this._UserRepository.updateOne({
            filter: { _id: id },
            update: { $push: { FCM_Token: token } },
        });
        if (!result)
            throw new Utils_1.BadRequstExption("Error while pushing token");
        return (0, Utils_1.SuccessResponse)({
            res,
            message: "done",
            data: { token, result },
        });
    };
    // ------------------------------------------------------------------------------------------------
    sendNotification = async (req, res) => {
        const user = this._GetAuthenticatedUser(req);
        const FCM_Token = user.FCM_Token || [];
        if (FCM_Token.length == 0)
            throw new Utils_1.BadRequstExption("User dose not have FCM Token : user notification token not found");
        // ===============================================================
        const { data } = req.body;
        // ===============================================================
        if (!FCM_Token || !data) {
            throw new Utils_1.BadRequstExption("FCM_Token or data is undefined");
        }
        // ===============================================================
        try {
            if (FCM_Token.length > 1) {
                const result = await this._NotificationService.SendNotifications({
                    fcm_tokens: FCM_Token,
                    data,
                });
                return (0, Utils_1.SuccessResponse)({
                    res,
                    message: "notifications send successfly",
                    data: result,
                });
            }
            else if (FCM_Token[0]) {
                const result = await this._NotificationService.SendNotification({
                    fcm_token: FCM_Token[0],
                    data,
                });
                return (0, Utils_1.SuccessResponse)({
                    res,
                    message: "notification send successfly",
                    data: result,
                });
            }
        }
        catch (err) {
            throw new Utils_1.BadRequstExption("error while sending notification", err);
        }
    };
}
exports.UserService = UserService;
exports.default = new UserService();
/*  */
