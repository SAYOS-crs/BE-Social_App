import crypto from "node:crypto";
import { IV_LENGTH, SECRET_KEY } from "../../Config/config";

export function CreateSecretKey() {
  const key: Buffer = crypto.randomBytes(IV_LENGTH);
  console.log(key.toString("hex"));
}

class EncryptionService {
  private _SecretKey: string = SECRET_KEY!;
  private _IV_Length = IV_LENGTH;
  constructor() {}

  Encrypt(content: string) {
    // 1.create iv using randomBytes
    const iv = crypto.randomBytes(this._IV_Length);
    // 2.create encryption method using create cipher iv method
    const Encryption = crypto.createCipheriv(
      "aes-256-gcm",
      this._SecretKey,
      iv,
    );
    // 3.encrypt data using encryption method
    let EncryptedData: string = Encryption.update(content, "utf-8", "hex");
    // 4. final statge and return
    EncryptedData += Encryption.final("hex");
    return `${iv.toString("hex")}:${EncryptedData} `;
  }

  DeCrypt(CipherContent: string) {
    // 1. distruct the iv and Decrypted content] from prametar
    const [string_iv, content] = CipherContent.split(":");
    // 2. convert the iv to buffer  > form utf-8 to hex using buffer
    const iv = Buffer.from(string_iv as string, "hex");
    // 3. create decode method using algorethem , secret key , iv
    const DeCryption = crypto.createDecipheriv(
      "aes-256-gcm",
      this._SecretKey,
      iv,
    );
    // 4. use the decode method and its take the data and cruunt form and what will be
    let DeCryptedData = DeCryption.update(content as string, "hex", "utf-8");
    // final statge and return
    DeCryptedData += DeCryption.final("utf-8");
    return DeCryptedData;
  }
}

export default new EncryptionService();
