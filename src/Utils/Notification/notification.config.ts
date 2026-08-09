import { initializeApp, getApps, cert } from "firebase-admin/app";
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
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
      });

export default FireBaseApp;

