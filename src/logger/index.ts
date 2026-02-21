export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.Debug]: 'DEBUG',
  [LogLevel.Info]: 'INFO',
  [LogLevel.Warn]: 'WARN',
  [LogLevel.Error]: 'ERROR',
};

export class Logger {
  private readonly component: string;
  private static minLevel: LogLevel = LogLevel.Info;

  constructor(component: string) {
    this.component = component;
  }

  static setLevel(level: LogLevel): void {
    Logger.minLevel = level;
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.Debug, msg, data);
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.Info, msg, data);
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.Warn, msg, data);
  }

  error(msg: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.Error, msg, data);
  }

  private log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (level < Logger.minLevel) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level: LEVEL_LABELS[level],
      component: this.component,
      msg,
      ...data,
    };

    const output = JSON.stringify(entry);
    if (level >= LogLevel.Error) {
      console.error(output);
    } else {
      console.log(output);
    }
  }
}
