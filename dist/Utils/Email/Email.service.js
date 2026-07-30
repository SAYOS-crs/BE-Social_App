"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendEmail = void 0;
const nodemailer_1 = require("nodemailer");
const config_1 = require("../../Config/config");
const response_1 = require("../response");
const SendEmail = async (MailInfo) => {
    const transporter = (0, nodemailer_1.createTransport)({
        service: "Gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: false,
        auth: {
            user: config_1.EMAIL, // the email you used to create app password
            pass: config_1.PASS, // your generated app password
        },
        // tls: {
        //   rejectUnauthorized: true,
        // },
    });
    // re assign te from
    MailInfo.from = `"Social App" <${config_1.EMAIL}> `;
    transporter.sendMail(MailInfo, (error, info) => {
        if (error)
            throw new response_1.BadRequstExption("error while sending email", error);
        console.log("email send successfly", info.response);
    });
};
exports.SendEmail = SendEmail;
