import chalk from "chalk";
import cors from "cors";
import express, { Express } from "express";
import { createHandler } from "graphql-http/lib/use/express";
import { PORT } from "./Config/config";
import { ConnectMongooseDB, ConnectRedisDB } from "./DB/Connection";
import { GlobaleErrorExption } from "./Middlewares";
import { AuthRouter } from "./Modules";
import { GQLschema } from "./Modules/GraphQL";
import { PostRouter } from "./Modules/Post";
import { UserRouter } from "./Modules/User";
import { NotFoundExption } from "./Utils";

export default async function bootstrap() {
  const app: Express = express();
  //// ==========\\ globale middlewares // ==========\\
  app.use(express.json());
  app.use(cors());
  //
  //
  //
  //
  //
  // // ==========\\ DB connections // ==========\\
  ConnectMongooseDB();
  ConnectRedisDB();
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
  app.all(
    "/api/v1/graphql",
    createHandler({
      schema: GQLschema,
      async context(req, params) {
        return { headers: req.headers };
      },
    }),
  );

  // ===========================================\\
  //
  // RestFull APIs
  app.use("/api/v1/auth", AuthRouter);
  app.use("/api/v1/user", UserRouter);
  app.use("/api/v1/post", PostRouter);
  // not found router handler
  app.use("/*dummy", (req, res, next) => {
    throw new NotFoundExption("Router not found!");
  });

  // global error handler - must be registered AFTER all routes
  app.use(GlobaleErrorExption);

  app.listen(PORT, (err) => {
    if (err && PORT) {
      let NewPORT = PORT + 1;
      app.listen(NewPORT, () => {
        console.log(
          chalk.green(
            `${chalk.red(`port ${PORT} is UnAvailable `)} , Server is running of port : ${chalk.blue(NewPORT)}`,
          ),
        );
        return;
      });
      return;
    }
    console.log(chalk.green(`Server is running of port : ${chalk.blue(PORT)}`));
  });
}
