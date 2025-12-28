// lib/logger.ts
// Structured logging utility with Sentry integration

import * as Sentry from "@sentry/nextjs";

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export interface LogContext {
  [key: string]: any;
}

export interface LogMetadata {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  userId?: string;
  requestId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  /**
   * Format log message for console output
   */
  private formatMessage(metadata: LogMetadata): string {
    const { timestamp, level, message, context } = metadata;
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Send log to Sentry if appropriate
   */
  private sendToSentry(metadata: LogMetadata): void {
    const { level, message, context, error } = metadata;

    // Only send warnings and errors to Sentry in production
    if (!this.isProduction || (level !== LogLevel.ERROR && level !== LogLevel.WARN)) {
      return;
    }

    // Add context to Sentry scope
    Sentry.withScope((scope) => {
      scope.setLevel(level as Sentry.SeverityLevel);

      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
      }

      if (metadata.userId) {
        scope.setUser({ id: metadata.userId });
      }

      if (metadata.requestId) {
        scope.setTag("requestId", metadata.requestId);
      }

      if (error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(message, level as Sentry.SeverityLevel);
      }
    });
  }

  /**
   * Core logging method
   */
  protected log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const metadata: LogMetadata = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    // Console output in development or for errors
    if (this.isDevelopment || level === LogLevel.ERROR) {
      const formattedMessage = this.formatMessage(metadata);

      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.log(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          if (error) console.warn(error);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          if (error) console.error(error);
          break;
      }
    }

    // Send to Sentry in production
    this.sendToSentry(metadata);
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Create a child logger with shared context
   */
  child(sharedContext: LogContext): Logger {
    const childLogger = new Logger();
    const originalLog = childLogger.log.bind(childLogger);

    childLogger.log = (level: LogLevel, message: string, context?: LogContext, error?: Error) => {
      const mergedContext = { ...sharedContext, ...context };
      originalLog(level, message, mergedContext, error);
    };

    return childLogger;
  }

  /**
   * Set user context for subsequent logs
   */
  setUser(userId: string): void {
    Sentry.setUser({ id: userId });
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    Sentry.setUser(null);
  }

  /**
   * Add breadcrumb for debugging context
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: "info",
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// API Logger class with request ID
class ApiLogger extends Logger {
  constructor(private requestId?: string) {
    super();
  }

  protected log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const enhancedContext = { ...context, requestId: this.requestId };
    super.log(level, message, enhancedContext, error);
  }
}

// Export helper to create API route logger with request ID
export function createApiLogger(requestId?: string): Logger {
  return new ApiLogger(requestId);
}
