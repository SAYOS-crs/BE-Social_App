import { RedisArgument, SetOptions } from "redis";
import { client } from "./Connection";

class RedisService {
  private _client = client;
  constructor() {}
  async set({
    key,
    value,
    ttl = 3600,
  }: {
    key: RedisArgument;
    value: RedisArgument | number;
    ttl?: number;
  }) {
    const result = await this._client.set(key, JSON.stringify(value), {
      expiration: {
        type: "EX",
        value: ttl,
      },
    });
    return result;
  }

  async get(key: RedisArgument) {
    const result = await this._client.get(key);
    return JSON.parse(result!);
  }

  async del(key: RedisArgument) {
    const result = await this._client.del(key);
    return result;
  }
}

export default new RedisService();
