import * as z from "zod";

/**
 * General reusable Zod fields for validation across all modules.
 * Import these fields to compose schemas instead of duplicating validation logic.
 */
export const GeneralFields = {
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
