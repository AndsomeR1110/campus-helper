/**
 * Error type shared by the lost-found and admin services.
 * The shape matches the API contract in CONTRIBUTING §6:
 * `{ error: { code, message } }`, optionally `fields` for validation failures.
 */
export class HttpError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function validationError(fields: Record<string, string>): HttpError {
  return new HttpError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", fields);
}

export function notFound(message = "This post is no longer available."): HttpError {
  return new HttpError(404, "NOT_FOUND", message);
}

export function forbidden(message = "You do not have permission to do that."): HttpError {
  return new HttpError(403, "FORBIDDEN", message);
}

export function conflict(code: string, message: string): HttpError {
  return new HttpError(409, code, message);
}
