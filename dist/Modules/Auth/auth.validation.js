"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginSchema = exports.SignupSchema = void 0;
const z = __importStar(require("zod"));
const Utils_1 = require("../../Utils");
const Utils_2 = require("../../Utils");
exports.SignupSchema = {
    body: z
        .strictObject({
        username: z.string(),
        Email: Utils_1.GeneralFields.Email,
        Password: Utils_1.GeneralFields.Password,
        confirmPassword: z.string(),
        phone: z.string(),
        address: z.string(),
        Gender: z.enum(Object.values(Utils_2.Enums.Gender)),
        // Rolle: z.enum(Object.values(Enums.Rolle)).optional(),
        // Providers: z.enum(Object.values(Enums.Providers)).optional(),
    })
        .superRefine((value, ctx) => {
        if (value.confirmPassword !== value.Password) {
            ctx.addIssue({
                path: ["confirmPassword"],
                code: "custom",
                message: "invalid confirm password , its not match with password",
            });
        }
    }),
};
exports.LoginSchema = {
    body: z.strictObject({
        Email: Utils_1.GeneralFields.Email,
        Password: Utils_1.GeneralFields.Password,
    }),
};
