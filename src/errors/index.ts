export enum ErrorCategory {
  /** URL parsing / validation errors */
  Parse = 'PARSE',
  /** External API errors (Spotify, YT Music, etc.) */
  Api = 'API',
  /** Rate limit exceeded */
  RateLimit = 'RATE_LIMIT',
  /** Configuration / environment errors */
  Config = 'CONFIG',
  /** Internal / unexpected errors */
  Internal = 'INTERNAL',
}

export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    category: ErrorCategory,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.context = context;
  }
}
