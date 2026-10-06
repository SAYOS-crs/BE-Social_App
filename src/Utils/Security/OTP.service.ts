import { customAlphabet } from "nanoid";
import { EmailType } from "../Email/Email.templet";

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
export const OTP_Creator = async (
  Email: string,
  OtpType: EmailType,
): Promise<string> => {
  const OTP: string = await GenerateOTP();
  // bad redis use ! : ever service must had singel job !
  // const EncryptedOTP = await hashingService.Hash(OTP);
  // const result = await RedisService.setOTP({
  //   key: OTP_Prefix(Email, OtpType),
  //   value: EncryptedOTP,
  // });
  // if (!result) throw new BadRequstExption("error while restoring OTP in Redis");
  return OTP;
};
