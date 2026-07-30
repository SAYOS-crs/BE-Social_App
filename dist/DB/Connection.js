"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
exports.ConnectMongooseDB = ConnectMongooseDB;
exports.ConnectRedisDB = ConnectRedisDB;
const mongoose_1 = require("mongoose");
const config_1 = require("../Config/config");
const chalk_1 = __importDefault(require("chalk"));
const client_1 = require("@redis/client");
async function ConnectMongooseDB() {
    try {
        await (0, mongoose_1.connect)(config_1.DB_URI, { connectTimeoutMS: 5000 });
        console.log(chalk_1.default.green(`MongoDB Connected Successfly on : ${chalk_1.default.blue(config_1.DB_URI)}`));
    }
    catch (error) {
        console.log(chalk_1.default.red("Error while connecting DB "), error);
    }
}
exports.client = (0, client_1.createClient)({
    url: config_1.REDIS_URL,
});
async function ConnectRedisDB() {
    try {
        await exports.client.connect();
        console.log(chalk_1.default.green(`RedisDB Connected Successfly on : ${chalk_1.default.blue(config_1.REDIS_URL)}`));
    }
    catch (err) {
        console.log("error while connecting Redis DB", err);
    }
}
