interface RateWindow {
  count: number;
  resetAt: number;
}

export interface RateLimitConfig {
  /** Max requests per window for a single user */
  userLimit: number;
  /** Max requests per window for a guild */
  guildLimit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  userLimit: 10,
  guildLimit: 60,
  windowMs: 60_000,
};

export class RateLimiter {
  private readonly config: RateLimitConfig;
  private readonly userWindows = new Map<string, RateWindow>();
  private readonly guildWindows = new Map<string, RateWindow>();

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if a request is allowed. Returns true if allowed, false if rate-limited.
   * Automatically increments counters if allowed.
   */
  check(userId: string, guildId: string | null): boolean {
    const now = Date.now();

    // Check user limit
    if (!this.checkWindow(this.userWindows, userId, this.config.userLimit, now)) {
      return false;
    }

    // Check guild limit
    if (guildId && !this.checkWindow(this.guildWindows, guildId, this.config.guildLimit, now)) {
      return false;
    }

    // Both passed — increment
    this.increment(this.userWindows, userId, now);
    if (guildId) {
      this.increment(this.guildWindows, guildId, now);
    }

    return true;
  }

  private checkWindow(
    windows: Map<string, RateWindow>,
    key: string,
    limit: number,
    now: number,
  ): boolean {
    const window = windows.get(key);
    if (!window || now >= window.resetAt) return true;
    return window.count < limit;
  }

  private increment(windows: Map<string, RateWindow>, key: string, now: number): void {
    const window = windows.get(key);
    if (!window || now >= window.resetAt) {
      windows.set(key, { count: 1, resetAt: now + this.config.windowMs });
    } else {
      window.count++;
    }
  }
}
