type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

const colors = {
  info: '\x1b[36m',    // Cyan
  success: '\x1b[32m', // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  debug: '\x1b[90m',   // Gray
  reset: '\x1b[0m',
};

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const color = colors[level];
    const prefix = `${color}[${timestamp}] [${level.toUpperCase()}] [${this.context}]${colors.reset}`;

    console.log(`${prefix} ${message}`);
    if (data !== undefined) {
      console.log(data);
    }
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  success(message: string, data?: unknown) {
    this.log('success', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }

  debug(message: string, data?: unknown) {
    if (process.env.DEBUG) {
      this.log('debug', message, data);
    }
  }

  progress(current: number, total: number, entity: string) {
    const percentage = Math.round((current / total) * 100);
    const bar = '='.repeat(Math.floor(percentage / 2)) + '-'.repeat(50 - Math.floor(percentage / 2));
    process.stdout.write(`\r[${bar}] ${percentage}% (${current}/${total}) ${entity}`);
    if (current === total) {
      console.log(); // New line when complete
    }
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}
