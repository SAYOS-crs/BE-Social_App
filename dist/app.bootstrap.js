"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bootstrap;
const express_1 = __importDefault(require("express"));
const config_1 = require("./Config/config");
const Modules_1 = require("./Modules");
const Middlewares_1 = require("./Middlewares");
const Connection_1 = require("./DB/Connection");
const Utils_1 = require("./Utils");
const chalk_1 = __importDefault(require("chalk"));
const User_1 = require("./Modules/User");
async function bootstrap() {
    const app = (0, express_1.default)();
    // globale middlewares
    app.use(express_1.default.json());
    //DB connections :
    (0, Connection_1.ConnectMongooseDB)();
    (0, Connection_1.ConnectRedisDB)();
    // SendOTP({
    //   Email: "eslam.sayos.crm.ki123@gmail.com",
    //   EmailType: EmailType.ConfirmEmail,
    // });
    // routers :
    app.use("/api/v1/auth", Modules_1.AuthRouter);
    app.use("/api/v1/user", User_1.UserRouter);
    // not found router handler
    app.use("/*dummy", (req, res, next) => {
        throw new Utils_1.NotFoundExption("Router not found!");
    });
    // global error handler - must be registered AFTER all routes
    app.use(Middlewares_1.GlobaleErrorExption);
    app.listen(config_1.PORT, () => {
        console.log(chalk_1.default.green(`Server is running of port : ${chalk_1.default.blue(config_1.PORT)}`));
    });
}
