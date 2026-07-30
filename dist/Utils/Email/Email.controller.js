"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyOTP = exports.SendOTP = void 0;
const RedisRepository_1 = __importDefault(require("../../DB/RedisRepository"));
const response_1 = require("../response");
const hashing_service_1 = __importDefault(require("../Security/hashing.service"));
const OTP_service_1 = require("../Security/OTP.service");
const Email_events_1 = require("./Email.events");
const Email_prefix_1 = require("./Email.prefix");
const Email_templet_1 = require("./Email.templet");
// generate and send otp
const SendOTP = async ({ Email, EmailType, }) => {
    // pramter will receive {Email , counter , EmailType}
    // step1 : create the otp using OTP creator that generate otp and hash it to store it in redis and return the string otp to send it to user
    const OTP = await (0, OTP_service_1.OTP_Creator)(Email, EmailType);
    if (!OTP)
        throw new response_1.BadRequstExption("Error while creating otp : step1 in SendOTP Operation");
    // step2 : send the otp
    const mailInfo = {
        subject: EmailType,
        to: Email,
        html: (0, Email_templet_1.HtmlTemplet)({ OTP, EmailType }),
    };
    Email_events_1.Event.emit(EmailType, mailInfo);
};
exports.SendOTP = SendOTP;
// verify otp + delete otp + confirm user email
const VerifyOTP = async (Email, OTP, OtpType) => {
    // OtpType === router in most cases
    // note : in this app the confirm email router is in side the auth so we dont need to verify if the email is exeists , the middleware will do it .
    // step1 : get the otp from the redis by email if exeist
    // step2 : compare the otp form redis and the otp from user
    // step3 : in the compare result its true > delete the otp form redis
    // step4 : return true to use in in router
    const isOTP = await RedisRepository_1.default.get((0, Email_prefix_1.OTP_Prefix)(Email, OtpType));
    if (!isOTP)
        throw new response_1.ConflictExption("InValid OTP or Email");
    const result = await hashing_service_1.default.Compare(OTP, isOTP);
    if (!result)
        throw new response_1.ConflictExption("invalid OTP");
    // else if (result) {
    //   await RedisService.del(OTP_Prefix(Email, OtpType));
    // }
    return true;
};
exports.VerifyOTP = VerifyOTP;
