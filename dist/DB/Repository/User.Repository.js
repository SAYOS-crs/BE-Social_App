"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DBRepository_1 = require("../DBRepository");
const User_model_1 = __importDefault(require("../models/User.model"));
class UserRepository extends DBRepository_1.BaseRepository {
    constructor() {
        super(User_model_1.default);
    }
}
exports.default = UserRepository;
