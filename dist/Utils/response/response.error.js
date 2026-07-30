"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForbiddenExption = exports.UnAuthroizedExption = exports.NotFoundExption = exports.ConflictExption = exports.BadRequstExption = exports.ApplicationErrorExption = void 0;
class ApplicationErrorExption extends Error {
    StatusCode;
    cause;
    constructor(message, StatusCode = 500, cause, options) {
        super(message, options);
        this.StatusCode = StatusCode;
        this.cause = cause;
        this.name = this.constructor.name;
    }
}
exports.ApplicationErrorExption = ApplicationErrorExption;
// _______________________
class BadRequstExption extends ApplicationErrorExption {
    constructor(message, cause, options) {
        super(message, 400, cause, options);
        this.name = this.constructor.name;
    }
}
exports.BadRequstExption = BadRequstExption;
class ConflictExption extends ApplicationErrorExption {
    constructor(message, cause, options) {
        super(message, 409, cause, options);
        this.name = this.constructor.name;
    }
}
exports.ConflictExption = ConflictExption;
class NotFoundExption extends ApplicationErrorExption {
    constructor(message, cause, options) {
        super(message, 404, cause, options);
        this.name = this.constructor.name;
    }
}
exports.NotFoundExption = NotFoundExption;
class UnAuthroizedExption extends ApplicationErrorExption {
    constructor(message, cause, options) {
        super(message, 401, cause, options);
        this.name = this.constructor.name;
    }
}
exports.UnAuthroizedExption = UnAuthroizedExption;
class ForbiddenExption extends ApplicationErrorExption {
    constructor(message = "Forbidden access", cause, options) {
        super(message, 403, cause, options);
        this.name = this.constructor.name;
    }
}
exports.ForbiddenExption = ForbiddenExption;
