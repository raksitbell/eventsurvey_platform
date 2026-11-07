/** Typed failure from a service — route handlers map `status` to HTTP. */
export class ServiceError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    code: string,
    status: number,
    message?: string,
    details?: unknown,
  ) {
    super(message ?? code);
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
