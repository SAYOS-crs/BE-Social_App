import { JwtPayload } from "jsonwebtoken";
import { ITokenPayload } from "../Security";
import { HUserDocument } from "../DB/models/User.model";

declare module "express-serve-static-core" {
  interface Request {
    /** Authenticated user document populated by the Authentication middleware. */
    user?: HUserDocument;

    /** Decoded JWT payload populated by the Authentication middleware. */
    decoded?: ITokenPayload & JwtPayload;
  }
}

// declare global {
//   namespace Express {
//     interface Request {
//       user?: HUserDocument; // Add your custom property here
//       decoded?: ITokenPayload & JwtPayload;
//     }
//   }
// }
