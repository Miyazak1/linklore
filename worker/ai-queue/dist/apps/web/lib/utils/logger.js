/**
 * 统一的日志工具
 * 替代 console.log，支持环境变量控制
 * 生产环境自动禁用 debug 和 info 日志
 */
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
// 从环境变量获取日志级别，默认生产环境只显示 warn 和 error
const getLogLevel = () => {
    // 检查是否在浏览器环境
    if (typeof globalThis !== 'undefined' && 'window' in globalThis && typeof globalThis.window !== 'undefined') {
        // 客户端：从环境变量或 localStorage 获取
        const win = globalThis.window;
        const level = process.env.NEXT_PUBLIC_LOG_LEVEL ||
            (win.localStorage ? win.localStorage.getItem('logLevel') : null) ||
            (process.env.NODE_ENV === 'production' ? 'warn' : 'debug');
        return level;
    }
    else {
        // 服务端/Worker：从环境变量获取
        const level = process.env.LOG_LEVEL ||
            (process.env.NODE_ENV === 'production' ? 'warn' : 'debug');
        return level;
    }
};
const shouldLog = (level) => {
    const currentLevel = getLogLevel();
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
};
/**
 * 格式化日志消息
 */
const formatMessage = (prefix, message, context) => {
    if (context && Object.keys(context).length > 0) {
        return `[${prefix}] ${message} ${JSON.stringify(context)}`;
    }
    return `[${prefix}] ${message}`;
};
/**
 * Debug 日志（开发环境）
 */
export const logger = {
    debug: (message, context) => {
        if (shouldLog('debug')) {
            console.debug(formatMessage('DEBUG', message, context));
        }
    },
    info: (message, context) => {
        if (shouldLog('info')) {
            console.info(formatMessage('INFO', message, context));
        }
    },
    warn: (message, context) => {
        if (shouldLog('warn')) {
            console.warn(formatMessage('WARN', message, context));
        }
    },
    error: (message, error, context) => {
        if (shouldLog('error')) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            console.error(formatMessage('ERROR', message, context), errorObj);
            // 在客户端，如果有 Sentry，发送错误
            if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
                const win = globalThis.window;
                if (win && win.Sentry) {
                    win.Sentry.captureException(errorObj, {
                        contexts: {
                            custom: context || {},
                        },
                        tags: {
                            message,
                        },
                    });
                }
            }
        }
    },
};
/**
 * 便捷方法：带模块前缀的日志
 */
export const createModuleLogger = (moduleName) => ({
    debug: (message, context) => {
        logger.debug(`[${moduleName}] ${message}`, context);
    },
    info: (message, context) => {
        logger.info(`[${moduleName}] ${message}`, context);
    },
    warn: (message, context) => {
        logger.warn(`[${moduleName}] ${message}`, context);
    },
    error: (message, error, context) => {
        logger.error(`[${moduleName}] ${message}`, error, context);
    },
});
