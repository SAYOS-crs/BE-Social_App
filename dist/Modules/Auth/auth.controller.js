"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Middlewares_1 = require("../../Middlewares");
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
router.post("/login", (0, Validation_middleware_1.default)(auth_validation_1.LoginSchema), async (req, res) => {
    const { Email, Password } = req.body;
    const result = await auth_service_1.default.Login({ payloude: { Email, Password } });
    return (0, Utils_1.SuccessResponse)({
        res,
        message: "user Loged in Successfly",
        data: result,
    });
});
// user how will confirm email &
router.post("/RequestEmailConfirmation", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), async (req, res) => {
    const { Email, confirmEmail } = Utils_1.Guard.GetAuthenticatedUser(req);
    // check if the email is confirmed already
    if (confirmEmail) {
        throw new Utils_1.ConflictExption("Email already Confirmed ");
    }
    const result = await auth_service_1.default.RequestEmailConfirmation({ Email });
    if (!result) {
        throw new Utils_1.BadRequstExption("error while sending email OTP");
    }
    return (0, Utils_1.SuccessResponse)({
        res,
        message: `OTP send successfly to : ${Email} `,
    });
});
router.patch("/ConfirmEmail", (0, Middlewares_1.Authentication)(Utils_1.TokenType.Access), (0, Validation_middleware_1.default)(auth_validation_1.ConfirmEmailSchema), async (req, res) => {
    const { Email, confirmEmail } = Utils_1.Guard.GetAuthenticatedUser(req);
    if (confirmEmail) {
        throw new Utils_1.BadRequstExption("email already Confirmed");
    }
    const { OTP } = req.body;
    const result = await auth_service_1.default.ConfirmEmail({ Email, OTP });
    if (!result) {
        throw new Utils_1.BadRequstExption("Error while Confirming Email , try again later");
    }
    return (0, Utils_1.SuccessResponse)({ res, message: "Email Confirmed Successfly" });
});
exports.default = router;
// note : in next project do a General Validation Schema for General use like schema for authorixation token (Bearer token)
