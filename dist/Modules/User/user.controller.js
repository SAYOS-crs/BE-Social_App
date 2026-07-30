"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_service_1 = __importDefault(require("./user.service"));
const Middlewares_1 = require("../../Middlewares");
const Utils_1 = require("../../Utils");
const router = (0, express_1.Router)();
router.get("/profile", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Middlewares_1.Authorization)([Utils_1.Rolle.User]), user_service_1.default.GetUserProfile);
exports.default = router;
