// DEPRECATED – archived by Codex 2025-06-07. Safe to delete after 90 days.
const LOG_LEVELS = {
    debug: { color: '#8B8B8B', emoji: '🔍' },
    info: { color: '#5558BC', emoji: 'ℹ️' },
    warn: { color: '#F0A500', emoji: '⚠️' },
    error: { color: '#E63946', emoji: '❌' }
};

export const logger = {
    _formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const { color, emoji } = LOG_LEVELS[level];
        const prefix = `%c${emoji} [${level.toUpperCase()}] ${timestamp}`;
        const style = `color: ${color}; font-weight: bold;`;
        
        if (args.length > 0) {
            console.groupCollapsed(prefix, style, message);
            args.forEach(arg => {
                if (typeof arg === 'object') {
                    console.dir(arg);
                } else {
                    console.log(arg);
                }
            });
            console.groupEnd();
        } else {
            console.log(prefix, style, message);
        }
    },

    debug(message, ...args) {
        this._formatMessage('debug', message, ...args);
    },

    info(message, ...args) {
        this._formatMessage('info', message, ...args);
    },

    warn(message, ...args) {
        this._formatMessage('warn', message, ...args);
    },

    error(message, ...args) {
        try {
            this._formatMessage('error', message, ...args);
            // If this is running in a Vue context, also emit to Vue error handler
            if (window.Vue && window.Vue.config.errorHandler) {
                window.Vue.config.errorHandler(new Error(message), null, 'logger');
            }
        } catch (e) {
            console.error('Logger error:', e);
            console.error('Original error:', message, ...args);
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