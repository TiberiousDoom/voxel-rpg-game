/**
 * Logger.js - Structured logging system
 *
 * Provides production-quality logging with levels, formatting,
 * and environment-aware behavior.
 */

/**
 * Log levels
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

/**
 * Log level names
 */
const LogLevelNames = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.NONE]: 'NONE',
};

/**
 * Log level colors for console output
 */
const LogLevelColors = {
  [LogLevel.DEBUG]: '#6B7280', // Gray
  [LogLevel.INFO]: '#3B82F6', // Blue
  [LogLevel.WARN]: '#F59E0B', // Amber
  [LogLevel.ERROR]: '#EF4444', // Red
};

/**
 * Logger class - Main logging service
 */
class Logger {
  constructor() {
    this.level = this.getDefaultLogLevel();
    this.logs = [];
    this.maxLogs = 1000;
    this.enableConsole = true;
    this.enableStorage = false;
    this.storageKey = 'game_logs';
    this.listeners = [];
  }

  /**
   * Get default log level based on environment
   */
  getDefaultLogLevel() {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
      return LogLevel.WARN;
    }

    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      return LogLevel.ERROR; // Less verbose during tests
    }

    return LogLevel.DEBUG; // Development
  }

  /**
   * Set the minimum log level
   * @param {number} level - Log level from LogLevel enum
   */
  setLevel(level) {
    if (level < LogLevel.DEBUG || level > LogLevel.NONE) {
      throw new Error('Invalid log level');
    }

    this.level = level;
  }

  /**
   * Enable or disable console logging
   * @param {boolean} enabled - Whether to enable console logging
   */
  setConsoleEnabled(enabled) {
    this.enableConsole = enabled;
  }

  /**
   * Enable or disable log storage
   * @param {boolean} enabled - Whether to enable log storage
   */
  setStorageEnabled(enabled) {
    this.enableStorage = enabled;

    if (enabled) {
      this.loadLogsFromStorage();
    }
  }

  /**
   * Add a log listener
   * @param {Function} listener - Function to call when logs are created
   */
  addListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    this.listeners.push(listener);
  }

  /**
   * Remove a log listener
   * @param {Function} listener - Listener to remove
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Create a log entry
   * @param {number} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data to log
   */
  log(level, message, data = null) {
    // Check if this level should be logged
    if (level < this.level) {
      return;
    }

    // Create log entry
    const entry = {
      level,
      levelName: LogLevelNames[level],
      message,
      data,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : null,
    };

    // Add to logs array
    this.addToLogs(entry);

    // Console output
    if (this.enableConsole) {
      this.writeToConsole(entry);
    }

    // Storage
    if (this.enableStorage) {
      this.saveLogsToStorage();
    }

    // Notify listeners
    this.notifyListeners(entry);
  }

  /**
   * Add entry to logs array
   */
  addToLogs(entry) {
    this.logs.push(entry);

    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Write log entry to console
   */
  writeToConsole(entry) {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.levelName}]`;
    const color = LogLevelColors[entry.level];

    // Format message with color
    const style = `color: ${color}; font-weight: bold`;

    // Output based on level
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`%c${prefix}`, style, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.log(`%c${prefix}`, style, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(`%c${prefix}`, style, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(`%c${prefix}`, style, entry.message, entry.data || '');
        break;
      default:
        console.log(`%c${prefix}`, style, entry.message, entry.data || '');
    }
  }

  /**
   * Save logs to localStorage
   */
  saveLogsToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const logsToSave = this.logs.slice(-100); // Save last 100 logs
      window.localStorage.setItem(this.storageKey, JSON.stringify(logsToSave));
    } catch (error) {
      console.warn('Failed to save logs to storage:', error);
    }
  }

  /**
   * Load logs from localStorage
   */
  loadLogsFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const stored = window.localStorage.getItem(this.storageKey);
      if (stored) {
        const loaded = JSON.parse(stored);
        this.logs = Array.isArray(loaded) ? loaded : [];
      }
    } catch (error) {
      console.warn('Failed to load logs from storage:', error);
    }
  }

  /**
   * Notify all listeners
   */
  notifyListeners(entry) {
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    });
  }

  /**
   * Log debug message
   * @param {string} message - Message to log
   * @param {any} data - Additional data
   */
  debug(message, data = null) {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {any} data - Additional data
   */
  info(message, data = null) {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log warning message
   * @param {string} message - Message to log
   * @param {any} data - Additional data
   */
  warn(message, data = null) {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {any} data - Additional data
   */
  error(message, data = null) {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Create a scoped logger with a prefix
   * @param {string} scope - Scope name (e.g., 'GameEngine', 'NPCSystem')
   */
  scope(scope) {
    return {
      debug: (message, data) => this.debug(`[${scope}] ${message}`, data),
      info: (message, data) => this.info(`[${scope}] ${message}`, data),
      warn: (message, data) => this.warn(`[${scope}] ${message}`, data),
      error: (message, data) => this.error(`[${scope}] ${message}`, data),
    };
  }

  /**
   * Get all logs
   * @param {number} level - Optional filter by level
   */
  getLogs(level = null) {
    if (level === null) {
      return [...this.logs];
    }

    return this.logs.filter(entry => entry.level === level);
  }

  /**
   * Get recent logs
   * @param {number} count - Number of recent logs to retrieve
   */
  getRecentLogs(count = 50) {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    const count = this.logs.length;
    this.logs = [];

    if (this.enableStorage && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(this.storageKey);
    }

    this.info(`Cleared ${count} logs`);
  }

  /**
   * Get log statistics
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
    };

    this.logs.forEach(entry => {
      const levelName = entry.levelName;
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Download logs as a file
   */
  downloadLogs() {
    if (typeof window === 'undefined') {
      return;
    }

    const logs = this.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game_logs_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.info('Logs downloaded');
  }

  /**
   * Group logs by time period
   * @param {number} periodMs - Period in milliseconds
   */
  groupByTimePeriod(periodMs = 60000) {
    const groups = {};

    this.logs.forEach(entry => {
      const timestamp = new Date(entry.timestamp).getTime();
      const periodKey = Math.floor(timestamp / periodMs) * periodMs;
      const periodLabel = new Date(periodKey).toISOString();

      if (!groups[periodLabel]) {
        groups[periodLabel] = [];
      }

      groups[periodLabel].push(entry);
    });

    return groups;
  }
}

// Create and export singleton instance
const logger = new Logger();

export default logger;
