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

export class BadRequstExption extends ApplicationErrorExption {
  constructor(
    message: string,
    StatusCode: number = 400,
    cause?: any,
    options?: ErrorOptions,
  ) {
    super(message, (StatusCode = 400), cause, options);
    this.name = this.constructor.name;
  }
}
export class ConflictExption extends ApplicationErrorExption {
  constructor(message: string, cause?: string, options?: ErrorOptions) {
    super(message, 409, cause, options);
    this.name = this.constructor.name;
  }
}
export class NotFoundExption extends ApplicationErrorExption {
  constructor(message: string, cause?: string, options?: ErrorOptions) {
    super(message, 404, cause, options);
    this.name = this.constructor.name;
  }
}
export class UnAuthroizedExption extends ApplicationErrorExption {
  constructor(message: string, cause?: string, options?: ErrorOptions) {
    super(message, 401, cause, options);
    this.name = this.constructor.name;
  }
}
