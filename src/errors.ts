export type BcaErrorCode =
  | "BCA_AUTH"
  | "BCA_RATE_LIMIT"
  | "BCA_UPSTREAM"
  | "BCA_NETWORK"
  | "BCA_BAD_REQUEST";

export class BcaError extends Error {
  readonly code: BcaErrorCode;
  readonly status?: number;
  constructor(code: BcaErrorCode, message: string, status?: number) {
    super(message);
    this.name = "BcaError";
    this.code = code;
    this.status = status;
  }
}

export class BcaAuthError extends BcaError {
  constructor(message = "Invalid or missing BCA_API_KEY") {
    super("BCA_AUTH", message, 401);
    this.name = "BcaAuthError";
  }
}

export class BcaRateLimitError extends BcaError {
  readonly retryAfter?: number;
  constructor(retryAfter?: number) {
    super(
      "BCA_RATE_LIMIT",
      `Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ""}`,
      429,
    );
    this.name = "BcaRateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class BcaUpstreamError extends BcaError {
  constructor(status: number, message = "BCA API upstream error") {
    super("BCA_UPSTREAM", `${message} (HTTP ${status})`, status);
    this.name = "BcaUpstreamError";
  }
}

export class BcaNetworkError extends BcaError {
  constructor(cause: unknown) {
    super("BCA_NETWORK", `Network error contacting BCA API: ${String(cause)}`);
    this.name = "BcaNetworkError";
    this.cause = cause;
  }
}

export class BcaBadRequestError extends BcaError {
  constructor(message: string) {
    super("BCA_BAD_REQUEST", message, 400);
    this.name = "BcaBadRequestError";
  }
}
