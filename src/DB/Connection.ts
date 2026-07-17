import { connect } from "mongoose";
import { DB_URI, REDIS_URL } from "../Config/config";
import chalk from "chalk";
import { createClient, RedisClientType } from "@redis/client";

export async function ConnectMongooseDB() {
  try {
    await connect(DB_URI, { connectTimeoutMS: 5000 });
    console.log(
      chalk.green(`MongoDB Connected Successfly on : ${chalk.blue(DB_URI)}`),
    );
  } catch (error) {
    console.log(chalk.red("Error while connecting DB "), error);
  }
}

export const client: RedisClientType = createClient({
  url: REDIS_URL,
});
export async function ConnectRedisDB() {
  try {
    await client.connect();
    console.log(
      chalk.green(`RedisDB Connected Successfly on : ${chalk.blue(REDIS_URL)}`),
    );
  } catch (err) {
    console.log("error while connecting Redis DB", err);
  }
}
