import express, { Express } from "express";
import { PORT } from "./Config/config";
import { AuthRouter } from "./Modules";
import { GlobaleErrorExption } from "./Middlewares";
import { ConnectMongooseDB, ConnectRedisDB } from "./DB/Connection";
import { NotFoundExption } from "./Utils";
import chalk from "chalk";
import { UserRouter } from "./Modules/User";

export default async function bootstrap() {
  const app: Express = express();
  // globale middlewares
  app.use(express.json());

  //DB connections :
  ConnectMongooseDB();
  ConnectRedisDB();
  // SendOTP({
  //   Email: "eslam.sayos.crm.ki123@gmail.com",
  //   EmailType: EmailType.ConfirmEmail,
  // });
  // routers :
  app.use("/api/v1/auth", AuthRouter);
  app.use("/api/v1/user", UserRouter);
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
