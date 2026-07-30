"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTP_Creator = exports.GenerateOTP = void 0;
const nanoid_1 = require("nanoid");
const hashing_service_1 = __importDefault(require("./hashing.service"));
const RedisRepository_1 = __importDefault(require("../../DB/RedisRepository"));
const Email_prefix_1 = require("../Email/Email.prefix");
const response_1 = require("../response");
// #generate OTP
// 1. create OTP
// 2. hash OTP
// 3. store the otp in redis
// 4. send the unEncrypted OTP to user via email
// ** function do one jop !!
const GenerateOTP = async () => {
    const OTP = (0, nanoid_1.customAlphabet)("123456789ABCDEFGYTRYUIOPZXNM", 6);
    return OTP();
};
exports.GenerateOTP = GenerateOTP;
const OTP_Creator = async (Email, OtpType) => {
    const OTP = await (0, exports.GenerateOTP)();
    const EncryptedOTP = await hashing_service_1.default.Hash(OTP);
    const result = await RedisRepository_1.default.set({
        key: (0, Email_prefix_1.OTP_Prefix)(Email, OtpType),
        value: EncryptedOTP,
    });
    if (!result)
        throw new response_1.BadRequstExption("error while restoring OTP in Redis");
    return OTP;
};
exports.OTP_Creator = OTP_Creator;
