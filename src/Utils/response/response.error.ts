export class ApplicationErrorExption extends Error {
  constructor(
    message: string,
    public StatusCode: number = 500,
    public override cause?: any,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = this.constructor.name;
  }
}
// _______________________
export class BadRequstExption extends ApplicationErrorExption {
  constructor(message: string, cause?: any, options?: ErrorOptions) {
    super(message, 400, cause, options);
    this.name = this.constructor.name;
  }
}
export class ConflictExption extends ApplicationErrorExption {
  constructor(message: string, cause?: unknown, options?: ErrorOptions) {
    super(message, 409, cause, options);

    this.name = this.constructor.name;
  }
}
export class NotFoundExption extends ApplicationErrorExption {
  constructor(message: string, cause?: unknown, options?: ErrorOptions) {
    super(message, 404, cause, options);
    this.name = this.constructor.name;
  }
}
export class UnAuthroizedExption extends ApplicationErrorExption {
  constructor(message: string, cause?: unknown, options?: ErrorOptions) {
    super(message, 401, cause, options);
    this.name = this.constructor.name;
  }
}
