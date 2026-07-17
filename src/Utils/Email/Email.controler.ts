import RedisService from "../../DB/RedisRepository";
import { BadRequstExption, ConflictExption } from "../response";
import hashingService from "../Security/hashing.service";
import { OTP_Creator } from "../Security/OTP.service";
import { Event } from "./Email.events";
import { OTP_Prefix } from "./Email.prefix";
import { ImailInfo } from "./Email.service";
import { EmailType, HtmlTemplet } from "./Email.templet";
// generate and send otp
export const SendOTP = async ({
  Email,
  EmailType,
}: {
  Email: string;
  EmailType: EmailType;
}) => {
  // pramter will receive {Email , counter , EmailType}
  // step1 : create the otp using OTP creator that generate otp and hash it to store it in redis and return the string otp to send it to user
  const OTP: string = await OTP_Creator(Email);
  if (!OTP)
    throw new BadRequstExption(
      "Error while creating otp : step1 in SendOTP Operation",
    );
  // step2 : send the otp
  const mailInfo: ImailInfo = {
    subject: EmailType,
    to: Email,
    html: HtmlTemplet({ OTP, EmailType }),
  };
  Event.emit(EmailType, mailInfo);
};

// verify otp + delete otp + confirm user email
const VerifyOTP = async (Email: string, OTP: string) => {
  // note : in this app the confirm email router is in side the auth so we dont need to verify if the email is exeists , the middleware will do it .
  // step1 : get the otp from the redis by email if exeist
  // step2 : compare the otp form redis and the otp from user
  // step3 : in the compare result its true > delete the otp form redis
  // step4 : return true to use in in router
  const isOTP = await RedisService.get(OTP_Prefix(Email));
  if (!isOTP) throw new ConflictExption("InValid OTP or Email");
  const result = await hashingService.Compare(OTP, isOTP);
  if (!result) throw new ConflictExption("invalid OTP");
  else if (result) {
    await RedisService.del(OTP_Prefix(Email));
  }
  return true;
};
