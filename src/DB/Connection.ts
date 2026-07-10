import { connect } from "mongoose";
import { DB_URI } from "../Config/config";
import chalk from "chalk";

export default async function ConnectDB() {
  try {
    await connect(DB_URI, { connectTimeoutMS: 5000 });
    console.log(
      chalk.green(`DB Connected Successfly on : ${chalk.blue(DB_URI)}`),
    );
  } catch (error) {
    console.log(chalk.red("Error while connecting DB "), error);
  }
}
