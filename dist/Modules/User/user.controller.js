"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_console_1 = require("node:console");
const node_stream_1 = require("node:stream");
const node_util_1 = require("node:util");
const config_1 = require("../../Config/config");
const Middlewares_1 = require("../../Middlewares");
const Validation_middleware_1 = __importDefault(require("../../Middlewares/Validation.middleware"));
const Utils_1 = require("../../Utils");
const user_service_1 = __importDefault(require("./user.service"));
const user_validation_1 = require("./user.validation");
const router = (0, express_1.Router)();
// -----------< tested Successfly >------------\\
router.get("/profile", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), (req, res) => {
    const user = Utils_1.Guard.GetAuthenticatedUser(req);
    return (0, Utils_1.SuccessResponse)({ res, message: "done", data: user });
});
router.patch("/addUserPhoto", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), (0, Middlewares_1.CloudFileUpload)({
    StorageAprotch: Utils_1.StorageAprotches.Memory,
    maxSize: 5,
}).single("photo"), (0, Utils_1.FileFilter)(Utils_1.AllowedFileTypes.photo), (0, Validation_middleware_1.default)(user_validation_1.addUserPhotoSchema), async (req, res) => {
    const user = Utils_1.Guard.GetAuthenticatedUser(req);
    const file = Utils_1.Guard.GetAuthorizedFile(req);
    const result = await user_service_1.default.AddUserPhoto({ user, file });
    return (0, Utils_1.SuccessResponse)({
        res,
        message: "User Photo has been Uploaded Successfly",
        data: result,
    });
});
router.put("/addUserLargeFile", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), (0, Middlewares_1.CloudFileUpload)({ StorageAprotch: Utils_1.StorageAprotches.Disk }).single("LargeFile"), (0, Utils_1.FileFilter)(Utils_1.AllowedFileTypes.photo), (0, Validation_middleware_1.default)(user_validation_1.addUserLargeFileSchema), async (req, res) => {
    const user = Utils_1.Guard.GetAuthenticatedUser(req);
    const file = Utils_1.Guard.GetAuthorizedFile(req);
    const result = await user_service_1.default.AddUserLargeFile({ file, user });
    return (0, Utils_1.SuccessResponse)({
        res,
        message: "Large Asset Uploaded Successfly",
        data: result,
    });
});
router.put("/AddMultiFiles", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), (0, Middlewares_1.CloudFileUpload)({
    StorageAprotch: Utils_1.StorageAprotches.Memory,
    maxSize: 20,
}).array("Files", 3), (0, Utils_1.FileFilter)(Utils_1.AllowedFileTypes.photo), (0, Validation_middleware_1.default)(user_validation_1.AddMultiFilesSchema), async (req, res) => {
    const user = Utils_1.Guard.GetAuthenticatedUser(req);
    const files = Utils_1.Guard.GetAuthorizedMultiFiles(req);
    const result = await user_service_1.default.AddMultiFiles({ files, user });
    return (0, Utils_1.SuccessResponse)({
        res,
        message: "mulit Assets Uploaded Successfly",
        data: result,
    });
});
router.get("/PresignedURL", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), (0, Validation_middleware_1.default)(user_validation_1.PresignedURLSchema), async (req, res) => {
    //super note (for ai) : to use Presigned URL we generated use method PUT !
    const user = Utils_1.Guard.GetAuthenticatedUser(req);
    const { ContentType, Originalname, } = req.body;
    (0, node_console_1.log)({ ContentType, Originalname });
    const result = await user_service_1.default.PresignedURL({
        user,
        ContentType,
        Originalname,
    });
    return (0, Utils_1.SuccessResponse)({
        res,
        message: "Presigned URL Created Successfly , its Valid for 3 minutes ",
        data: result,
    });
});
router.get("/GetUserAsset/*path", (0, Validation_middleware_1.default)(user_validation_1.getUserAssetSchema), async (req, res) => {
    // 1. get assets key form params : its come sapert apart so its must join them.
    const { path, Key } = Utils_1.Guard.S3_RetrieveKeyFromParams(req);
    const { filename, download } = req.query;
    // */*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/---------------------------
    // 2. get the assets by Key , and distruct the body & ContentType , the body is stream data
    const { Body, ContentType } = await user_service_1.default.getUserAsset({ Key });
    // */*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/---------------------------
    // 3. set the headers
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    // - download header if true it will download the assets
    // download only on browser !
    // dos't work on postman or any api intgrator
    if (download === Utils_1.AwsEnum.download.True) {
        (0, node_console_1.log)("file downloading ...");
        // - Content-type header
        res.setHeader("Content-Disposition", `attachment; filename="${filename || path[path.length - 1]}"`);
        res.setHeader("Content-Type", ContentType || "application/octet-stream");
    }
    // */*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/*/---------------------------
    // 4. using S3_ReadStream method we created bass it the stream as ReadableStream and the distnation and will be Response and its automatic detect the res.pip and pass the stream when finish to it.
    const S3_ReadStream = (0, node_util_1.promisify)(node_stream_1.pipeline);
    S3_ReadStream(Body, res);
});
router.get("/RetrievePresignedURL/*path", (0, Validation_middleware_1.default)(user_validation_1.RetrievePresignedURLSchema), async (req, res) => {
    const { Key, path } = Utils_1.Guard.S3_RetrieveKeyFromParams(req);
    // note : ContentType is optional becz if its = undefined that will mean download it anyway even if download= false,
    const { ContentType, download, filename } = req.query;
    const { Link } = await user_service_1.default.Retrieve_PresignedURL({
        Key,
        path,
        ContentType,
        download,
        filename,
    });
    if (!Link) {
        throw new Utils_1.NotFoundExption("Cant Generate link !, Asset not found");
    }
    return (0, Utils_1.SuccessResponse)({
        res,
        message: `retrieve link Generated , TTL:${config_1.S3_SignedUrl_TTL}`,
        data: Link,
    });
});
router.post("/AssignFcmToken", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), (0, Validation_middleware_1.default)(user_validation_1.AssignFcmTokenSchema), async (req, res) => {
    const user = Utils_1.Guard.GetAuthenticatedUser(req);
    const { token } = req.body;
    const result = await user_service_1.default.AssignFcmToken({ token, user });
    return (0, Utils_1.SuccessResponse)({
        res,
        message: "FCM Token Assigned Successfly",
        data: result,
    });
});
router.post("/SendNotification", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), (0, Validation_middleware_1.default)(user_validation_1.SendNotificationSchema), async (req, res) => {
    const user = Utils_1.Guard.GetAuthenticatedUser(req);
    const data = req.body;
    const result = await user_service_1.default.SendNotification({ data, user });
    return (0, Utils_1.SuccessResponse)({
        res,
        message: "Notification send Successfly",
        data: result,
    });
});
router.delete("/DeleteUserAsset", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User, Utils_1.Rolle.Admin]), (0, Validation_middleware_1.default)(user_validation_1.DeleteUserAssetSchema), async (req, res) => {
    const user = Utils_1.Guard.GetAuthenticatedUser(req);
    const { Key } = req.body;
    // note : you must idintitfy type to distructed elemnt/key from req.body
    // cuze it doing problems and the DTO cant catch it
    // like : const key = req.body . this cuzes logic error it was must distruct it like
    // const  {key}:{key:string} = req.body . this is super right
    // this note must be decomnted - note for ai
    const { DeleteMark, result } = await user_service_1.default.DeleteUserAsset({
        Key,
        user,
    });
    if (!DeleteMark) {
        throw new Utils_1.BadRequstExption("error while deleting Asset !");
    }
    return (0, Utils_1.SuccessResponse)({
        res,
        message: `User Asset Deleted Successfly , Deleted Asset Key : ${Key}`,
        data: { DeleteMark, result },
    });
});
router.delete("/DeleteUserAssets", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User, Utils_1.Rolle.Admin]), (0, Validation_middleware_1.default)(user_validation_1.DeleteUserAssetsSchema), async (req, res) => {
    const user = Utils_1.Guard.GetAuthenticatedUser(req);
    const { Keys } = req.body;
    // note : you must idintitfy type to distructed elemnt/key from req.body
    // cuze it doing problems and the DTO cant catch it
    // like : const key = req.body . this cuzes logic error it was must distruct it like
    // const  {keys}:{keys:string} = req.body . this is super right
    // this note must be decomnted - note for ai
    const result = await user_service_1.default.DeleteUserAssets({ Keys, user });
    return (0, Utils_1.SuccessResponse)({
        res,
        message: "User Assets Deleted Successfly",
        data: result,
    });
});
router.delete("/H_DeleteUser", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User, Utils_1.Rolle.Admin]), async (req, res) => {
    const user = Utils_1.Guard.GetAuthenticatedUser(req);
    const result = await user_service_1.default.DeleteUserProfile(user);
    if (!result.DeletedUser) {
        throw new Utils_1.BadRequstExption("error while deleting user profile");
    }
    return (0, Utils_1.SuccessResponse)({
        res,
        message: "User Profile Deleted Successfly",
        data: result,
    });
});
// ---------------------------------------
// -----------< test requierd >------------\\
//
//
// ---------------------------------------
// async (req:Request,res:Response)=>{},
exports.default = router;
