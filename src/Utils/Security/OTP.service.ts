import { customAlphabet, nanoid } from "nanoid";
import hashingService from "./hashing.service";
import RedisService from "../../DB/RedisRepository";
import { OTP_Prefix } from "../Email/Email.prefix";
import { BadRequstExption } from "../response";

// #generate OTP
// 1. create OTP
// 2. hash OTP
// 3. store the otp in redis
// 4. send the unEncrypted OTP to user via email
// ** function do one jop !!
export const GenerateOTP = async () => {
  const OTP = customAlphabet("123456789ABCDEFGYTRYUIOPZXNM", 6);
  return OTP();
};
export const OTP_Creator = async (Email: string): Promise<string> => {
  const OTP: string = await GenerateOTP();
  const EncryptedOTP = await hashingService.Hash(OTP);
  const result = await RedisService.set({
    key: OTP_Prefix(Email),
    value: EncryptedOTP,
  });
  if (!result) throw new BadRequstExption("error while restoring OTP in Redis");
  return OTP;
};
