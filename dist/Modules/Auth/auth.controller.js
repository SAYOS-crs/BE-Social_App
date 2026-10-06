"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Validation_middleware_1 = __importDefault(require("../../Middlewares/Validation.middleware"));
const Utils_1 = require("../../Utils");
const auth_service_1 = __importDefault(require("./auth.service"));
const auth_validation_1 = require("./auth.validation");
const router = (0, express_1.Router)();
router.post("/signup", (0, Validation_middleware_1.default)(auth_validation_1.SignupSchema), async (req, res) => {
    // 1. distructing
    const { Email, Gender, Password, address, phone, username, } = req.body;
    // 2. reloude the elemnts into payloude object
    const payloude = {
        Email,
        Gender,
        Password,
        address,
        phone,
        username,
    };
    // 2. send the payloude to signup service
    const result = await auth_service_1.default.SignUp({ payloude });
    return (0, Utils_1.SuccessResponse)({
        res,
        message: "Account created Successfly",
        data: result,
    });
});
router.post("/login", (0, Validation_middleware_1.default)(auth_validation_1.LoginSchema), auth_service_1.default.Login);
router.post("/SendConfirmationEmail", auth_service_1.default.SendConfirmEmail);
router.patch("/ConfirmEmail", auth_service_1.default.ConfirmEmail);
exports.default = router;
