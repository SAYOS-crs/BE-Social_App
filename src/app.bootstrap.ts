import express, { Express } from "express";
import { PORT } from "./Config/config";
import { AuthRouter } from "./Modules";
import { GlobaleErrorExption } from "./Middlewares";

export default function bootstrap() {
  const app: Express = express();
  app.use(express.json());
  app.use("/api/v1/auth", AuthRouter);
  app.use(GlobaleErrorExption);
  app.listen(PORT, () => {
    console.log(`Server is running of port : ${PORT}`);
  });
}
