"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function SuccessResponse({ res, message = "done", data, status = 200, }) {
    return res.status(status).json({ message, data });
}
exports.default = SuccessResponse;
