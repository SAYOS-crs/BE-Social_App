import { createTransport, Transport } from "nodemailer";
import { EMAIL, PASS } from "../../Config/config";
import { EmailType } from "./Email.templet";
import { BadRequstExption } from "../response";

export interface ImailInfo {
  from?: string;
  to?: string;
  subject?: EmailType;
  text?: string;
  html?: string;
}

export const SendEmail = async (MailInfo: ImailInfo) => {
  const transporter = createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: false,
    auth: {
      user: EMAIL, // the email you used to create app password
      pass: PASS, // your generated app password
    },
    // tls: {
    //   rejectUnauthorized: true,
    // },
  });
  // re assign te from
  MailInfo.from = `"Social App" <${EMAIL}> `;
  transporter.sendMail(MailInfo, (error, info) => {
    if (error) throw new BadRequstExption("error while sending email", error);
    console.log("email send successfly", info.response);
  });
};
