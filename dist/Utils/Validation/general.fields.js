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
exports.GeneralFields = void 0;
const mongoose_1 = require("mongoose");
const z = __importStar(require("zod"));
const Enums_1 = require("../Enums");
/**
 * General reusable Zod fields for validation across all modules.
 * Import these fields to compose schemas instead of duplicating validation logic.
 */
exports.GeneralFields = {
    id: z
        .string()
        .refine((v) => mongoose_1.Types.ObjectId.isValid(v), { error: "id in not valid" }),
    Email: z
        .string({ message: "Email is required" })
        .email("Invalid email format")
        .max(35, "Email must be at most 35 characters")
        .min(9, "Email must be at least 9 characters")
        .trim()
        .toLowerCase(),
    Password: z
        .string({ message: "Password is required" })
        .max(20, "Password must be at most 20 characters")
        .min(8, "Password must be at least 8 characters"),
    Token: z
        .string({ message: "Token is required" })
        .min(1, "Token must not be empty"),
    OTP: z
        .string({ message: "OTP is required" })
        .length(6, "OTP must be exactly 6 characters"),
    content: z.string(),
    visibility: z.enum(Enums_1.PostEnum.VisibilityEnum),
    fileId: z.string(),
    // last stand was her : the problem was the (tags , likes) expected array but recivied string
    // hint : so we need to make (tags , likes) exept array | string
    // and also we have proplem in file validation
    tags: z.union([z.array(z.string()), z.string()]),
    likes: z.union([z.array(z.string()), z.string()]),
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    file: function (mimtype) {
        return z
            .strictObject({
            fieldname: z.string(),
            originalname: z.string(),
            encoding: z.string(),
            mimetype: z.enum(mimtype, { error: "file type not allowed" }),
            // buffer for memory storage
            buffer: z.any().optional(),
            // destination + filename for disk storage (tmp)
            destination: z.string().optional(),
            filename: z.string().optional(),
            path: z.string().optional(),
            size: z.number(),
        })
            .superRefine((values, ctx) => {
            if (!values.path && !values.buffer) {
                ctx.addIssue({
                    code: "custom",
                    path: ["path", "buffer"],
                    message: `there is not path or buffer from file }`,
                });
            }
        });
    },
    react: z.coerce.number().refine((v) => {
        // this is how to make sure react number is in the enum of reacts
        return Object.values(Enums_1.PostEnum.PostReactEnum).includes(Number(v));
    }, { error: "react number not valid" }),
    // enhance needed !
    Key: z.string(),
    ContentType: z.string(),
    Originalname: z.string(),
    filename: z.string(),
    download: z.enum(Enums_1.AwsEnum.download),
    path: z.array(z.string()),
    Notification_title: z.string().min(5).max(20),
    Notification_body: z.string().min(10).max(50),
};
