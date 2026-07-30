"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
const events_1 = __importDefault(require("events"));
const Email_templet_1 = require("./Email.templet");
const Email_service_1 = require("./Email.service");
exports.Event = new events_1.default();
exports.Event.on(Email_templet_1.EmailType.ConfirmEmail, async (ImailInfo) => {
    await (0, Email_service_1.SendEmail)(ImailInfo);
});
