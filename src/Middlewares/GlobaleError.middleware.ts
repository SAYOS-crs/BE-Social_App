import { NextFunction, Request, Response } from "express";

interface IError extends Error {
  StatusCode: number;
  cause?: string;
}

const GlobaleErrorExption = (
  error: IError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.status(error.StatusCode || 500).json({
    message: error.message,
    statuscode: error.StatusCode,
    cause: error?.cause,
    stack: error?.stack,
  });
};

export default GlobaleErrorExption;
