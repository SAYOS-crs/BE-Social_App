import { NextFunction, Request, Response } from "express";
import { GraphQLError } from "graphql";
import { log } from "node:console";
import z, { ZodError, ZodType } from "zod";
import { ConflictExption } from "../Utils";

interface ValidationSchema {
  [key: string]: ZodType;
}

export default function Validation(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ErrorResults: ZodError[] = [];
    if (req.files) {
      req.body.files = req.files;
      console.log(req.body);
    }
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
export function GqlValidation<T>(schema: z.ZodType, data: T): void | never {
  const result = schema.safeParse(data);
  log("GraphQL Validation Result :", result);
  if (!result.success) {
    throw new GraphQLError("Validation error", { cause: result.error.issues });
  }

  return;
}
