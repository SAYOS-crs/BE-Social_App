import { Request } from "express";
import { HUserDocument } from "../../DB/models/User.model";
import { UnAuthroizedExption } from "../response";

export const GetAuthenticatedUser = (req: Request): HUserDocument => {
  if (!req.user) {
    throw new UnAuthroizedExption("User is not authenticated");
  }
  return req.user;
};
