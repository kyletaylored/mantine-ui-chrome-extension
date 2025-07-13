import log from 'loglevel';

// Simple logger class that mimics the existing debugLog pattern
class ExtensionLogger {
  static instance;

  constructor() {
    // Set log level based on environment
    const isProduction = !chrome.runtime.getManifest().key; // Development builds have a key
    log.setLevel(isProduction ? log.levels.WARN : log.levels.DEBUG);
    
    // Configure with timestamp formatting
    const originalFactory = log.methodFactory;
    log.methodFactory = (methodName, logLevel, loggerName) => {
      const rawMethod = originalFactory(methodName, logLevel, loggerName);
      return (message, ...args) => {
        const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
        rawMethod(`[${timestamp}] ${message}`, ...args);
      };
    };
    log.rebuild();
  }

  static getInstance() {
    if (!ExtensionLogger.instance) {
      ExtensionLogger.instance = new ExtensionLogger();
    }
    return ExtensionLogger.instance;
  }

  /**
   * Main debug logging method that replaces debugLog functions
   */
  debug(component, operation, messageType, data) {
    const message = `[${component} Debug] ${operation} - ${messageType}`;
    
    if (data !== undefined && data !== null) {
      log.debug(message, data);
    } else {
      log.debug(message);
    }
  }

  /**
   * Info level logging
   */
  info(component, message, data) {
    const logMessage = `[${component}] ${message}`;
    if (data !== undefined && data !== null) {
      log.info(logMessage, data);
    } else {
      log.info(logMessage);
    }
  }

  /**
   * Warning level logging
   */
  warn(component, message, data) {
    const logMessage = `[${component}] ${message}`;
    if (data !== undefined && data !== null) {
      log.warn(logMessage, data);
    } else {
      log.warn(logMessage);
    }
  }

  /**
   * Error level logging
   */
  error(component, message, data) {
    const logMessage = `[${component}] ${message}`;
    if (data !== undefined && data !== null) {
      log.error(logMessage, data);
    } else {
      log.error(logMessage);
    }
  }
}

// Export singleton instance
export const logger = ExtensionLogger.getInstance();

// Helper function to create a debugLog replacement for a component
export const createLogger = (componentName) => ({
  debug: (operation, messageType, data) => 
    logger.debug(componentName, operation, messageType, data),
  info: (message, data) => 
    logger.info(componentName, message, data),
  warn: (message, data) => 
    logger.warn(componentName, message, data),
  error: (message, data) => 
    logger.error(componentName, message, data)
});