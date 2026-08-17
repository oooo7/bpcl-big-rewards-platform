type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  message: string;
  context?: string;
  data?: any;
  actorId?: string;
}

class Logger {
  private format(level: LogLevel, payload: LogPayload) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level: level.toUpperCase(),
      context: payload.context || 'APP',
      message: payload.message,
      actorId: payload.actorId,
      ...(payload.data ? { data: payload.data } : {}),
    };
  }

  info(message: string, context?: string, data?: any) {
    console.log(JSON.stringify(this.format('info', { message, context, data })));
  }

  warn(message: string, context?: string, data?: any) {
    console.warn(JSON.stringify(this.format('warn', { message, context, data })));
  }

  error(message: string, context?: string, data?: any) {
    console.error(JSON.stringify(this.format('error', { message, context, data })));
  }

  debug(message: string, context?: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify(this.format('debug', { message, context, data })));
    }
  }
}

export const logger = new Logger();
