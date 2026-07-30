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
const z = __importStar(require("zod"));
/**
 * General reusable Zod fields for validation across all modules.
 * Import these fields to compose schemas instead of duplicating validation logic.
 */
exports.GeneralFields = {
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
};
