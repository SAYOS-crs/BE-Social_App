import express, { Express } from "express";
import { PORT } from "./Config/config";
import { AuthRouter } from "./Modules";
import { GlobaleErrorExption } from "./Middlewares";
import ConnectDB from "./DB/Connection";
import { NotFoundExption } from "./Utils";
import chalk from "chalk";

export default function bootstrap() {
  const app: Express = express();
  // globale middlewares
  app.use(express.json());
  // connections :
  ConnectDB();

  // routers :
  app.use("/api/v1/auth", AuthRouter);
  app.use(GlobaleErrorExption);
  // not found router handler

  app.listen(PORT, () => {
    console.log(chalk.green(`Server is running of port : ${chalk.blue(PORT)}`));
  });
}
