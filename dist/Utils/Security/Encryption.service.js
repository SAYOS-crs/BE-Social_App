"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSecretKey = CreateSecretKey;
const node_crypto_1 = __importDefault(require("node:crypto"));
const config_1 = require("../../Config/config");
function CreateSecretKey() {
    const key = node_crypto_1.default.randomBytes(config_1.IV_LENGTH);
    console.log(key.toString("hex"));
}
class EncryptionService {
    _SecretKey = config_1.SECRET_KEY;
    _IV_Length = config_1.IV_LENGTH;
    constructor() { }
    Encrypt(content) {
        // 1.create iv using randomBytes
        const iv = node_crypto_1.default.randomBytes(this._IV_Length);
        // 2.create encryption method using create cipher iv method
        const Encryption = node_crypto_1.default.createCipheriv("aes-256-gcm", this._SecretKey, iv);
        // 3.encrypt data using encryption method
        let EncryptedData = Encryption.update(content, "utf-8", "hex");
        // 4. final statge and return
        EncryptedData += Encryption.final("hex");
        return `${iv.toString("hex")}:${EncryptedData} `;
    }
    DeCrypt(CipherContent) {
        // 1. distruct the iv and Decrypted content] from prametar
        const [string_iv, content] = CipherContent.split(":");
        // 2. convert the iv to buffer  > form utf-8 to hex using buffer
        const iv = Buffer.from(string_iv, "hex");
        // 3. create decode method using algorethem , secret key , iv
        const DeCryption = node_crypto_1.default.createDecipheriv("aes-256-gcm", this._SecretKey, iv);
        // 4. use the decode method and its take the data and cruunt form and what will be
        let DeCryptedData = DeCryption.update(content, "hex", "utf-8");
        // final statge and return
        DeCryptedData += DeCryption.final("utf-8");
        return DeCryptedData;
    }
}
exports.default = new EncryptionService();
