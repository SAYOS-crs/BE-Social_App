"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_service_1 = __importDefault(require("./user.service"));
const Middlewares_1 = require("../../Middlewares");
const Utils_1 = require("../../Utils");
const router = (0, express_1.Router)();
router.get("/profile", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), user_service_1.default.GetUserProfile);
router.patch("/addUserPhoto", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), (0, Middlewares_1.CloudFileUpload)({
    StorageAprotch: Utils_1.StorageAprotches.Memory,
    maxSize: 5,
}).single("photo"), (0, Utils_1.FileFilter)(Utils_1.AllowedFileTypes.photo), user_service_1.default.AddUserPhoto);
router.get("/getUserAsset/*path", user_service_1.default.getUserAsset);
router.get("/RetrievePresignedURL/*path", user_service_1.default.Retrieve_PresignedURL);
router.put("/addUserLargeFile", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), (0, Middlewares_1.CloudFileUpload)({ StorageAprotch: Utils_1.StorageAprotches.Disk }).single("LargeFile"), (0, Utils_1.FileFilter)(Utils_1.AllowedFileTypes.photo), user_service_1.default.AddUserLargeFile);
router.put("/AddMultiFiles", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), (0, Middlewares_1.CloudFileUpload)({
    StorageAprotch: Utils_1.StorageAprotches.Memory,
    maxSize: 20,
}).array("images", 3), 
// FileFilter(AllowedFileTypes.photo),
user_service_1.default.AddMultiFiles);
router.get("/PresignedURL", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), user_service_1.default.PresignedURL);
router.post("/assignFCMtoken", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), user_service_1.default.GetFCM_Token);
router.post("/sendNotification", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), user_service_1.default.sendNotification);
router.delete("/DeleteUserAsset", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User, Utils_1.Rolle.Admin]), user_service_1.default.Delete_Asset);
router.delete("/DeleteUserAssets", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User, Utils_1.Rolle.Admin]), user_service_1.default.Delete_Assets);
router.delete("/", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User, Utils_1.Rolle.Admin]), user_service_1.default.DeleteUserProfile);
exports.default = router;
