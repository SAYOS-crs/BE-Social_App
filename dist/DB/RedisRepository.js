"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Connection_1 = require("./Connection");
class RedisService {
    _client = Connection_1.client;
    constructor() { }
    async set({ key, value, ttl = 3600, }) {
        const result = await this._client.set(key, JSON.stringify(value), {
            expiration: {
                type: "EX",
                value: ttl,
            },
        });
        return result;
    }
    async get(key) {
        const result = await this._client.get(key);
        return JSON.parse(result);
    }
    async del(key) {
        const result = await this._client.del(key);
        return result;
    }
}
exports.default = new RedisService();
