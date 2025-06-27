export const logDebug = (...args: unknown[]): void => {
  if (__DEV__) {
    console.log('[DEBUG]', ...args);
  }
};

export const logInfo = (...args: unknown[]): void => {
  if (__DEV__) {
    console.info('[INFO]', ...args);
  }
};

export const logWarn = (...args: unknown[]): void => {
  if (__DEV__) {
    console.warn('[WARN]', ...args);
  }
};

export const logError = (...args: unknown[]): void => {
  if (__DEV__) {
    console.error('[ERROR]', ...args);
  }
};
