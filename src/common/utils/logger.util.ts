import { Logger } from '@nestjs/common';

export interface LogContext {
  service?: string;
  method?: string;
  [key: string]: any;
}

export class LoggerUtil {
  /**
   * Creates a structured log context with service information
   */
  static createContext(
    serviceName: string,
    methodName?: string,
    additionalContext: Record<string, any> = {},
  ): LogContext {
    return {
      service: serviceName,
      method: methodName,
      timestamp: new Date().toISOString(),
      ...additionalContext,
    };
  }

  /**
   * Sanitizes context to remove sensitive information
   */
  static sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    const sanitized = { ...context };

    for (const key in sanitized) {
      if (sensitiveKeys.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Creates a logger with structured formatting for JSON output
   */
  static createStructuredLogger(context: string): Logger {
    const logger = new Logger(context);
    return logger;
  }

  /**
   * Logs with structured context ensuring no sensitive data is logged
   */
  static logWithContext(
    logger: Logger,
    level: 'log' | 'warn' | 'error' | 'debug',
    message: string,
    context: LogContext,
  ): void {
    const sanitizedContext = this.sanitizeContext(context);

    switch (level) {
      case 'log':
        logger.log(message, sanitizedContext);
        break;
      case 'warn':
        logger.warn(message, sanitizedContext);
        break;
      case 'error':
        logger.error(message, sanitizedContext);
        break;
      case 'debug':
        logger.debug(message, sanitizedContext);
        break;
    }
  }
}
