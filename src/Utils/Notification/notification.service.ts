import { getMessaging } from "firebase-admin/messaging";
import { BadRequstExption } from "../response";
import FireBaseApp from "./notification.config";
class NotificationService {
  // ---------- send single notification
  async SendNotification({
    fcm_token,
    data,
  }: {
    fcm_token: string;
    data: { title: string; body: string };
  }) {
    try {
      const payload = {
        token: fcm_token,
        data,
      };
      return await getMessaging(FireBaseApp).send(payload);
    } catch (err) {
      throw new BadRequstExption("Error while sending notoification", err);
    }
  }
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // ------------ send multieble notification
  async SendNotifications({
    fcm_tokens,
    data,
  }: {
    fcm_tokens: string[];
    data: { title: string; body: string };
  }) {
    return await Promise.allSettled(
      fcm_tokens.map((token) => {
        return this.SendNotification({ fcm_token: token, data });
      }),
    );
  }
}

export default new NotificationService();
