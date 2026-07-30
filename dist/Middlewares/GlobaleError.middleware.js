"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GlobaleErrorExption = (error, req, res, next) => {
    res.status(error.StatusCode || 500).json({
        message: error.message,
        statuscode: error.StatusCode,
        cause: error?.cause,
        stack: error?.stack,
    });
};
exports.default = GlobaleErrorExption;
