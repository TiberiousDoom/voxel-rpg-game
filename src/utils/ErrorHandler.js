/**
 * ErrorHandler.js - Centralized error handling system
 *
 * Provides structured error handling, logging, and recovery mechanisms
 * for production-quality error management.
 */

import Logger from './Logger';

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Error categories for better organization
 */
export const ErrorCategory = {
  GAME_ENGINE: 'game_engine',
  RENDERING: 'rendering',
  PERSISTENCE: 'persistence',
  MODULE: 'module',
  UI: 'ui',
  NETWORK: 'network',
  VALIDATION: 'validation',
  PERFORMANCE: 'performance',
  UNKNOWN: 'unknown',
};

/**
 * Custom error class with additional context
 */
export class GameError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'GameError';
    this.category = options.category || ErrorCategory.UNKNOWN;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.context = options.context || {};
    this.timestamp = new Date().toISOString();
    this.recoverable = options.recoverable !== false;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GameError);
    }
  }
}

/**
 * ErrorHandler - Main error handling service
 */
class ErrorHandler {
  constructor() {
    this.errorQueue = [];
    this.maxQueueSize = 100;
    this.errorHandlers = new Map();
    this.isInitialized = false;

    // Error statistics
    this.stats = {
      total: 0,
      byCategory: {},
      bySeverity: {},
    };
  }

  /**
   * Initialize the error handler
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }

    // Global error handler for unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError.bind(this));
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    }

    this.isInitialized = true;
    Logger.info('ErrorHandler initialized');
  }

  /**
   * Handle global window errors
   */
  handleGlobalError(event) {
    const error = new GameError(event.message, {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.HIGH,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });

    this.handle(error);
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection(event) {
    const error = new GameError(
      event.reason?.message || 'Unhandled promise rejection',
      {
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        context: {
          reason: event.reason,
        },
      }
    );

    this.handle(error);
  }

  /**
   * Register a custom error handler for specific categories
   * @param {string} category - Error category
   * @param {Function} handler - Handler function
   */
  registerHandler(category, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    this.errorHandlers.set(category, handler);
    Logger.debug(`Registered error handler for category: ${category}`);
  }

  /**
   * Handle an error
   * @param {Error|GameError} error - The error to handle
   * @param {Object} options - Additional options
   */
  handle(error, options = {}) {
    // Convert regular errors to GameError
    const gameError = error instanceof GameError
      ? error
      : new GameError(error.message, {
          category: options.category || ErrorCategory.UNKNOWN,
          severity: options.severity || ErrorSeverity.MEDIUM,
          context: { originalError: error },
        });

    // Update statistics
    this.updateStats(gameError);

    // Add to error queue
    this.addToQueue(gameError);

    // Log the error
    this.logError(gameError);

    // Execute custom handler if registered
    const handler = this.errorHandlers.get(gameError.category);
    if (handler) {
      try {
        handler(gameError);
      } catch (handlerError) {
        Logger.error('Error in custom error handler:', handlerError);
      }
    }

    // Execute recovery if error is recoverable
    if (gameError.recoverable && options.recovery) {
      this.attemptRecovery(gameError, options.recovery);
    }

    return gameError;
  }

  /**
   * Log error with appropriate severity
   */
  logError(error) {
    const logMessage = `[${error.category}] ${error.message}`;
    const logContext = {
      severity: error.severity,
      category: error.category,
      context: error.context,
      stack: error.stack,
      timestamp: error.timestamp,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        Logger.error(logMessage, logContext);
        break;
      case ErrorSeverity.HIGH:
        Logger.error(logMessage, logContext);
        break;
      case ErrorSeverity.MEDIUM:
        Logger.warn(logMessage, logContext);
        break;
      case ErrorSeverity.LOW:
        Logger.info(logMessage, logContext);
        break;
      default:
        Logger.warn(logMessage, logContext);
    }
  }

  /**
   * Attempt error recovery
   */
  attemptRecovery(error, recoveryFn) {
    try {
      Logger.info(`Attempting recovery for error: ${error.message}`);
      recoveryFn(error);
      Logger.info('Recovery successful');
    } catch (recoveryError) {
      Logger.error('Recovery failed:', recoveryError);

      // Create a new critical error for failed recovery
      const criticalError = new GameError(
        'Error recovery failed',
        {
          category: error.category,
          severity: ErrorSeverity.CRITICAL,
          context: {
            originalError: error,
            recoveryError,
          },
          recoverable: false,
        }
      );

      this.handle(criticalError);
    }
  }

  /**
   * Add error to queue
   */
  addToQueue(error) {
    this.errorQueue.push(error);

    // Maintain max queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  /**
   * Update error statistics
   */
  updateStats(error) {
    this.stats.total++;

    // Update category stats
    this.stats.byCategory[error.category] =
      (this.stats.byCategory[error.category] || 0) + 1;

    // Update severity stats
    this.stats.bySeverity[error.severity] =
      (this.stats.bySeverity[error.severity] || 0) + 1;
  }

  /**
   * Get error statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.errorQueue.length,
    };
  }

  /**
   * Get recent errors
   * @param {number} count - Number of recent errors to retrieve
   */
  getRecentErrors(count = 10) {
    return this.errorQueue.slice(-count);
  }

  /**
   * Clear error queue
   */
  clearQueue() {
    const count = this.errorQueue.length;
    this.errorQueue = [];
    Logger.info(`Cleared ${count} errors from queue`);
  }

  /**
   * Clear all statistics
   */
  clearStats() {
    this.stats = {
      total: 0,
      byCategory: {},
      bySeverity: {},
    };
    Logger.info('Error statistics cleared');
  }

  /**
   * Wrap a function with error handling
   * @param {Function} fn - Function to wrap
   * @param {Object} options - Error handling options
   */
  wrap(fn, options = {}) {
    return (...args) => {
      try {
        const result = fn(...args);

        // Handle promises
        if (result && typeof result.then === 'function') {
          return result.catch(error => {
            this.handle(error, options);
            if (options.rethrow) {
              throw error;
            }
          });
        }

        return result;
      } catch (error) {
        this.handle(error, options);
        if (options.rethrow) {
          throw error;
        }
      }
    };
  }

  /**
   * Create a safe async function wrapper
   * @param {Function} fn - Async function to wrap
   * @param {Object} options - Error handling options
   */
  wrapAsync(fn, options = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, options);
        if (options.rethrow) {
          throw error;
        }
      }
    };
  }
}

// Create and export singleton instance
const errorHandler = new ErrorHandler();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  errorHandler.initialize();
}

export default errorHandler;
