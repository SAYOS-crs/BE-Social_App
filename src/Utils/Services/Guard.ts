import { Request } from "express";
import { UnAuthroizedExption } from "../response";

export const GetAuthenticatedUser = <T>(req: Request): T => {
  if (!req.user) {
    throw new UnAuthroizedExption("User is not authenticated");
  }
  return req.user as T;
};
