"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_service_1 = __importDefault(require("./auth.service"));
const Validation_middleware_1 = __importDefault(require("../../Middlewares/Validation.middleware"));
const auth_validation_1 = require("./auth.validation");
const router = (0, express_1.Router)();
router.post("/signup", (0, Validation_middleware_1.default)(auth_validation_1.SignupSchema), auth_service_1.default.SignUp);
router.post("/login", (0, Validation_middleware_1.default)(auth_validation_1.LoginSchema), auth_service_1.default.Login);
router.post("/SendConfirmationEmail", auth_service_1.default.SendConfirmEmail);
router.patch("/ConfirmEmail", auth_service_1.default.ConfirmEmail);
exports.default = router;
