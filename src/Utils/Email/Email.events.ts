import EventEmitter from "events";
import { EmailType } from "./Email.templet";
import { ImailInfo, SendEmail } from "./Email.service";

export const Event = new EventEmitter();

Event.on(EmailType.ConfirmEmail, async (ImailInfo: ImailInfo) => {
  await SendEmail(ImailInfo);
});
