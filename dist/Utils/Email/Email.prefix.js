"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTP_Prefix = void 0;
const OTP_Prefix = (Email, OtpType) => {
    // OtpType > to prevent the multi otp of one user
    return `Email-${OtpType}-PrefixOf:${Email}:`;
};
exports.OTP_Prefix = OTP_Prefix;
