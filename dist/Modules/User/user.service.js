"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const User_Repository_1 = __importDefault(require("../../DB/Repository/User.Repository"));
const Utils_1 = require("../../Utils");
const node_console_1 = require("node:console");
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// -
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
    // ---------------------------------------- routers ----------------------------------------\\
    // public GetUserProfile = async (
    //   req: Request,
    //   res: Response,
    // ): Promise<HUserDocument> => {
    //   const user = this._GetAuthenticatedUser(req);
    //   return user
    // };
    DeleteUserProfile = async (user) => {
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
        return { DeletedUser, DeletedAssets };
    };
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ---------------------------------------- Upload Assets ----------------------------------------
    AddUserPhoto = async ({ user, file, }) => {
        // -------------------------------------------------------
        const Key = await this._AWS_S3.UploadFile({
            file,
            path: (0, Utils_1.s3PathKeyPrefix)({
                AssetType: Utils_1.AwsEnum.AssetType.Profile,
                file,
                folder: Utils_1.AwsEnum.FolderType.User,
                id: user.id,
            }),
        });
        console.log("file mimetype & originalname of AddUserPhoto endpint : ", file.mimetype, file.originalname);
        if (!Key)
            throw new Utils_1.BadRequstExption("Error while Uploading Asset to AWS Service !");
        console.log("s3 file key :", Key);
        // -------------------------------------------------------
        const result = await this._UserRepository.updateOne({
            filter: { _id: user._id },
            update: { UserImage: Key },
        });
        if (!result) {
            if (Key) {
                await this._AWS_S3.DeleteAsset({ Key });
            }
            throw new Utils_1.BadRequstExption("error while setting user photo");
        }
        return { result, Key };
    };
    // ------------------------------------------------------------------------------------------------
    AddUserLargeFile = async ({ user, file, }) => {
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
            throw new Utils_1.BadRequstExption("error while uploading assets to aws s3!");
        }
        // --------------------------------------------------------------
        // 4. send the Key form AWS to User CoverImage
        const result = await this._UserRepository.updateOne({
            filter: { _id: user._id },
            update: { $push: { CoverImage: Key } },
        });
        if (!result) {
            if (Key) {
                await this._AWS_S3.DeleteAsset({ Key });
            }
            throw new Utils_1.BadRequstExption("Error while Updating User CoverImage!");
        }
        return { result, Key };
    };
    // ------------------------------------------------------------------------------------------------
    AddMultiFiles = async ({ user, files, }) => {
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
            if (Keys) {
                await this._AWS_S3.DeleteAssets({ Keys });
            }
            throw new Utils_1.BadRequstExption("Error while adding Keys form s3 to user");
        }
        return { result, Keys };
    };
    // ------------------------------------------------------------------------------------------------
    PresignedURL = async ({ user, ContentType, Originalname, }) => {
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
        // STEP 2: Extract file metadata provided by client (no binary payload here)
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
        if (!result.modifiedCount) {
            throw new Utils_1.BadRequstExption("error while Updating User , there is was not any update happend ");
        }
        // STEP 5: Send response containing `{ link, Key }` to client for direct upload
        return { payload, result };
    };
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ---------------------------------- Retrieve & Download Assets ----------------------------------\\
    getUserAsset = async ({ Key, }) => {
        // 2. get the assets by Key , and distruct the body , the body is stream data
        const { Body, ContentType } = await this._AWS_S3.RetrieveAsset({ Key });
        // */*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/-----------------------------
        // return body (streaming data)
        return { Body, ContentType };
    };
    // ------------------------------------------------------------------------------------------------
    Retrieve_PresignedURL = async ({ filename, download, ContentType, path, Key, }) => {
        console.log(filename, download, ContentType);
        // note : ContentType is optional becz if its = undefined that will mean download it anyway even if download= false,
        const Link = await this._AWS_S3.Retrieve_PresignedURL({
            Key,
            path,
            filename,
            download,
            ContentType,
        });
        return { Link };
    };
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------- Delete Assets -------------------------------------------\\
    // ss
    DeleteUserAsset = async ({ user, Key, }) => {
        const DeleteMark = await this._AWS_S3.DeleteAsset({ Key });
        if (!DeleteMark) {
            throw new Utils_1.BadRequstExption("Error while Deleting Asset From AWS S3 User Bucket");
        }
        const result = await this._UserRepository.updateOne({
            filter: { _id: user._id },
            update: { $pull: { CoverImage: Key } },
        });
        return { result, DeleteMark };
    };
    // ------------------------------------------------------------------------------------------------
    DeleteUserAssets = async ({ user, Keys, }) => {
        if (!Array.isArray(Keys)) {
            (0, node_console_1.log)(Keys);
            throw new Utils_1.BadRequstExption(`Keys must be an Array : received ${Keys}`);
        }
        // const ArrayOfKeys: { Key: string }[] = Keys.map((k) => {
        //   return { Key: k };
        // });
        console.log("delete asstes key :", Keys);
        // now DeleteAssets \ DeleteAsset take string[] instaed of { Key: string }[]
        const Deleted = await this._AWS_S3.DeleteAssets({
            Keys,
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
        return { result, Deleted };
    };
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------
    // ---------------------------------------- notifications -----------------------------------------\\
    AssignFcmToken = async ({ user, token, }) => {
        const { id, FCM_Token } = user;
        if (FCM_Token?.includes(token)) {
            throw new Utils_1.ConflictExption("token already assigned !");
        }
        const result = await this._UserRepository.updateOne({
            filter: { _id: id },
            update: { $push: { FCM_Token: token } },
        });
        if (!result)
            throw new Utils_1.BadRequstExption("Error while pushing token");
        return { token, result };
    };
    // ------------------------------------------------------------------------------------------------
    SendNotification = async ({ user, data, }) => {
        const FCM_Token = user.FCM_Token || [];
        if (FCM_Token.length == 0)
            throw new Utils_1.BadRequstExption("User dose not have FCM Token : user notification token not found");
        // ===============================================================
        // ===============================================================
        if (!FCM_Token || !data) {
            throw new Utils_1.BadRequstExption("FCM_Token or data is undefined");
        }
        // ===============================================================
        try {
            if (FCM_Token.length > 1) {
                return await this._NotificationService.SendNotifications({
                    fcm_tokens: FCM_Token,
                    data,
                });
            }
            else if (FCM_Token[0]) {
                return await this._NotificationService.SendNotification({
                    fcm_token: FCM_Token[0],
                    data,
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
