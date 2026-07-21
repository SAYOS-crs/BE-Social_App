import { EmailType } from "./Email.templet";

export const OTP_Prefix = (Email: string, OtpType: EmailType) => {
  // OtpType > to prevent the multi otp of one user
  return `Email-${OtpType}-PrefixOf:${Email}:`;
};
