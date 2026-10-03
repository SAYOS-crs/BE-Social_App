"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bootstrap;
const chalk_1 = __importDefault(require("chalk"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_2 = require("graphql-http/lib/use/express");
const config_1 = require("./Config/config");
const Connection_1 = require("./DB/Connection");
const Middlewares_1 = require("./Middlewares");
const Modules_1 = require("./Modules");
const GraphQL_1 = require("./Modules/GraphQL");
const Post_1 = require("./Modules/Post");
const User_1 = require("./Modules/User");
const Utils_1 = require("./Utils");
async function bootstrap() {
    const app = (0, express_1.default)();
    //// ==========\\ globale middlewares // ==========\\
    app.use(express_1.default.json());
    app.use((0, cors_1.default)());
    //
    //
    //
    //
    //
    // // ==========\\ DB connections // ==========\\
    (0, Connection_1.ConnectMongooseDB)();
    (0, Connection_1.ConnectRedisDB)();
    // SendOTP({
    //   Email: "eslam.sayos.crm.ki123@gmail.com",
    //   EmailType: EmailType.ConfirmEmail,
    // });
    //
    //
    //
    //
    // =========================\\ routers // =========================\\
    //
    //
    // ==========\\ GraphQL API // ==========\\
    // gql handler
    //
    // ** GraphQL Step 1 : create gql api + handler
    app.all("/api/v1/graphql", (0, express_2.createHandler)({
        schema: GraphQL_1.GQLschema,
        async context(req, params) {
            return { headers: req.headers };
        },
    }));
    // ===========================================\\
    //
    // RestFull APIs
    app.use("/api/v1/auth", Modules_1.AuthRouter);
    app.use("/api/v1/user", User_1.UserRouter);
    app.use("/api/v1/post", Post_1.PostRouter);
    // not found router handler
    app.use("/*dummy", (req, res, next) => {
        throw new Utils_1.NotFoundExption("Router not found!");
    });
    // global error handler - must be registered AFTER all routes
    app.use(Middlewares_1.GlobaleErrorExption);
    app.listen(config_1.PORT, (err) => {
        if (err && config_1.PORT) {
            let NewPORT = config_1.PORT + 1;
            app.listen(NewPORT, () => {
                console.log(chalk_1.default.green(`${chalk_1.default.red(`port ${config_1.PORT} is UnAvailable `)} , Server is running of port : ${chalk_1.default.blue(NewPORT)}`));
                return;
            });
            return;
        }
        console.log(chalk_1.default.green(`Server is running of port : ${chalk_1.default.blue(config_1.PORT)}`));
    });
}
