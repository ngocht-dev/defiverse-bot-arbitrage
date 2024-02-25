export enum ErrorCodes {
  NOT_FOUND_TOKEN = 'NOT_FOUND_TOKEN',
}

export class GenericError extends Error {
  name: string;
  message: string;
  private code: ErrorCodes;
  private cause: string;

  constructor(code: ErrorCodes, message?: string, cause?: string) {
    super(message ?? code);
    this.message = message ?? code;
    this.code = code;
    this.name = code;
    this.cause = cause;
  }
  getMessage(code?: ErrorCodes) {
    return `${this.code ?? code}: ${this.message ?? code}`;
  }
}
