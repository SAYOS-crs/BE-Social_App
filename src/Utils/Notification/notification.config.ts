import admin from "firebase-admin";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const serviceAccount = JSON.parse(
  readFileSync(
    resolve(
      "./src/Config/social-app-382fc-firebase-adminsdk-fbsvc-daf6bd8424.json",
    ),
    "utf-8",
  ),
);

const FireBaseApp =
  admin.apps.length > 0
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

export default FireBaseApp;
