"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("../Utils");
/**
 * Authorization Middleware Factory
 *
 * Takes an array of allowed roles (`roles`) that can access a specific route.
 * Must be placed after the `Authentication` middleware in the route chain,
 * as it relies on `req.user` being populated.
 *
 * @param roles - Array of allowed user roles (`Enums.Rolle[]`)
 * @returns Express middleware function
 */
const Authorization = (roles) => {
    return async (req, res, next) => {
        try {
            // Guard: Ensure user is authenticated and attached to request by Authentication middleware
            if (!req.user) {
                throw new Utils_1.UnAuthroizedExption("User is not authenticated");
            }
            // Check if user's role (req.user.Rolle) is included in the allowed roles array
            if (!roles.includes(req.user.Rolle)) {
                throw new Utils_1.ForbiddenExption("You are not authorized to access this route");
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.default = Authorization;
