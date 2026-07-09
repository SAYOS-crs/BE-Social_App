import { NextFunction, Request, Response } from "express";
import { ZodError, ZodType } from "zod";
import { ConflictExption } from "../Utils";

interface ValidationSchema {
  [key: string]: ZodType;
}

export default function Validation(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ErrorResults: ZodError[] = [];

    for (const key of Object.keys(schema)) {
      if (!schema[key]) continue;

      const result = schema[key].safeParse(req[key as keyof Request]);

      if (!result.success) {
        ErrorResults.push(result.error);
      }
    }

    if (ErrorResults.length) {
      throw new ConflictExption(
        "Validation Error",
        ErrorResults.map((e) => {
          return e.issues;
        }),
      );
    }
    next();
  };
}
