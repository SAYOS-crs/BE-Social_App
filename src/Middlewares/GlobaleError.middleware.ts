import { NextFunction, Request, Response } from "express";

interface IError extends Error {
  StatusCode: number;
  cause: string;
}

const GlobaleErrorExption = (
  error: IError,
  req: Request,
  res: Response,
  next: NextFunction,
): Response => {
  return res.status(error.StatusCode).json({
    name: error.name,
    message: error.message,
    cause: error?.cause,
    stack: error?.stack,
  });
};
export default GlobaleErrorExption;
