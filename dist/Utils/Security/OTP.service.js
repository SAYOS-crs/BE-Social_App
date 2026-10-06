"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTP_Creator = exports.GenerateOTP = void 0;
const nanoid_1 = require("nanoid");
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
    // bad redis use ! : ever service must had singel job !
    // const EncryptedOTP = await hashingService.Hash(OTP);
    // const result = await RedisService.setOTP({
    //   key: OTP_Prefix(Email, OtpType),
    //   value: EncryptedOTP,
    // });
    // if (!result) throw new BadRequstExption("error while restoring OTP in Redis");
    return OTP;
};
exports.OTP_Creator = OTP_Creator;
