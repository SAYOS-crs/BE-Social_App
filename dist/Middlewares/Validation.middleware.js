"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Validation;
exports.GqlValidation = GqlValidation;
const graphql_1 = require("graphql");
const node_console_1 = require("node:console");
const Utils_1 = require("../Utils");
function Validation(schema) {
    return (req, res, next) => {
        const ErrorResults = [];
        if (req.files) {
            req.body.files = req.files;
            console.log(req.body);
        }
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
function GqlValidation(schema, data) {
    const result = schema.safeParse(data);
    (0, node_console_1.log)("GraphQL Validation Result :", result);
    if (!result.success) {
        throw new graphql_1.GraphQLError("Validation error", { cause: result.error.issues });
    }
    return;
}
