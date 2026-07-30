"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = require("bcrypt");
const config_1 = require("../../Config/config");
class HashingService {
    constructor() { }
    async Hash(content) {
        const HashedData = await (0, bcrypt_1.hash)(content, config_1.SULT);
        return HashedData;
    }
    async Compare(content, HashedData) {
        const result = await (0, bcrypt_1.compare)(content, HashedData);
        return result;
    }
}
exports.default = new HashingService();
