import { JwtPayload } from "jsonwebtoken";
import { HUserDocument } from "../../DB/models/User.model";
import { ITokenPayload } from "../Security";

declare module "express-serve-static-core" {
  interface Request {
    /** Authenticated user document populated by the Authentication middleware. */
    user?: HUserDocument;

    /** Decoded JWT payload populated by the Authentication middleware. */
    decoded?: ITokenPayload & JwtPayload;
  }
}
