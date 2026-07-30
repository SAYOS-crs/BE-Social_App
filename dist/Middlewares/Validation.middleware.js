"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Validation;
const Utils_1 = require("../Utils");
function Validation(schema) {
    return (req, res, next) => {
        const ErrorResults = [];
        for (const key of Object.keys(schema)) {
            if (!schema[key])
                continue;
            const result = schema[key].safeParse(req[key]);
            if (!result.success) {
                ErrorResults.push(result.error);
            }
        }
        if (ErrorResults.length) {
            throw new Utils_1.ConflictExption("Validation Error", ErrorResults.map((e) => {
                return e.issues;
            }));
        }
        next();
    };
}
