// Logger configuration
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

const currentLevel = LOG_LEVELS.DEBUG;

// Logger implementation
export const logger = {
    debug(...args) {
        if (currentLevel <= LOG_LEVELS.DEBUG) {
            console.debug('[DEBUG]', ...args);
        }
    },
    
    info(...args) {
        if (currentLevel <= LOG_LEVELS.INFO) {
            console.info('[INFO]', ...args);
        }
    },
    
    warn(...args) {
        if (currentLevel <= LOG_LEVELS.WARN) {
            console.warn('[WARN]', ...args);
        }
    },
    
    error(...args) {
        if (currentLevel <= LOG_LEVELS.ERROR) {
            console.error('[ERROR]', ...args);
        }
    },
    
    group(label) {
        console.group(label);
    },
    
    groupEnd() {
        console.groupEnd();
    },
    
    time(label) {
        console.time(label);
    },
    
    timeEnd(label) {
        console.timeEnd(label);
    }
}; 