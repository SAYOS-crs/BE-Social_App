"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_Repository_1 = __importDefault(require("../../DB/Repository/User.Repository"));
const Utils_1 = require("../../Utils");
class UserService {
    _UserRepository = new User_Repository_1.default();
    constructor() { }
    GetUserProfile = async (req, res) => {
        const user = req.user;
        return (0, Utils_1.SuccessResponse)({ res, message: "good", data: user });
    };
}
exports.default = new UserService();
