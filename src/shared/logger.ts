import log from 'loglevel';

// Simple logger class that mimics the existing debugLog pattern
class ExtensionLogger {
  private static instance: ExtensionLogger;

  private constructor() {
    // Set log level based on environment
    const isProduction = !chrome.runtime.getManifest().key; // Development builds have a key
    log.setLevel(isProduction ? log.levels.WARN : log.levels.DEBUG);
    
    // Configure with timestamp formatting
    const originalFactory = log.methodFactory;
    log.methodFactory = (methodName, logLevel, loggerName) => {
      const rawMethod = originalFactory(methodName, logLevel, loggerName);
      return (message: string, ...args: any[]) => {
        const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
        rawMethod(`[${timestamp}] ${message}`, ...args);
      };
    };
    log.rebuild();
  }

  static getInstance(): ExtensionLogger {
    if (!ExtensionLogger.instance) {
      ExtensionLogger.instance = new ExtensionLogger();
    }
    return ExtensionLogger.instance;
  }

  /**
   * Main debug logging method that replaces debugLog functions
   */
  debug(component: string, operation: string, messageType: string, data?: any): void {
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
  info(component: string, message: string, data?: any): void {
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
  warn(component: string, message: string, data?: any): void {
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
  error(component: string, message: string, data?: any): void {
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
export const createLogger = (componentName: string) => ({
  debug: (operation: string, messageType: string, data?: any) => 
    logger.debug(componentName, operation, messageType, data),
  info: (message: string, data?: any) => 
    logger.info(componentName, message, data),
  warn: (message: string, data?: any) => 
    logger.warn(componentName, message, data),
  error: (message: string, data?: any) => 
    logger.error(componentName, message, data)
}); 