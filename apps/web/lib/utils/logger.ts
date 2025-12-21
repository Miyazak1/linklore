/**
 * 统一的日志工具
 * 替代 console.log，支持环境变量控制
 * 生产环境自动禁用 debug 和 info 日志
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

// 从环境变量获取日志级别，默认生产环境只显示 warn 和 error
const getLogLevel = (): LogLevel => {
	// 检查是否在浏览器环境
	if (typeof globalThis !== 'undefined' && 'window' in globalThis && typeof (globalThis as any).window !== 'undefined') {
		// 客户端：从环境变量或 localStorage 获取
		const win = (globalThis as any).window;
		const level = process.env.NEXT_PUBLIC_LOG_LEVEL || 
			(win.localStorage ? (win.localStorage.getItem('logLevel') as LogLevel) : null) ||
			(process.env.NODE_ENV === 'production' ? 'warn' : 'debug');
		return level as LogLevel;
	} else {
		// 服务端/Worker：从环境变量获取
		const level = process.env.LOG_LEVEL || 
			(process.env.NODE_ENV === 'production' ? 'warn' : 'debug');
		return level as LogLevel;
	}
};

const shouldLog = (level: LogLevel): boolean => {
	const currentLevel = getLogLevel();
	return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
};

interface LogContext {
	[key: string]: any;
}

/**
 * 格式化日志消息
 */
const formatMessage = (prefix: string, message: string, context?: LogContext): string => {
	if (context && Object.keys(context).length > 0) {
		return `[${prefix}] ${message} ${JSON.stringify(context)}`;
	}
	return `[${prefix}] ${message}`;
};

/**
 * Debug 日志（开发环境）
 */
export const logger = {
	debug: (message: string, context?: LogContext) => {
		if (shouldLog('debug')) {
			console.debug(formatMessage('DEBUG', message, context));
		}
	},

	info: (message: string, context?: LogContext) => {
		if (shouldLog('info')) {
			console.info(formatMessage('INFO', message, context));
		}
	},

	warn: (message: string, context?: LogContext) => {
		if (shouldLog('warn')) {
			console.warn(formatMessage('WARN', message, context));
		}
	},

	error: (message: string, error?: Error | unknown, context?: LogContext) => {
		if (shouldLog('error')) {
			const errorObj = error instanceof Error ? error : new Error(String(error));
			console.error(formatMessage('ERROR', message, context), errorObj);
			
			// 在客户端，如果有 Sentry，发送错误
			if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
				const win = (globalThis as any).window;
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
export const createModuleLogger = (moduleName: string) => ({
	debug: (message: string, context?: LogContext) => {
		logger.debug(`[${moduleName}] ${message}`, context);
	},
	info: (message: string, context?: LogContext) => {
		logger.info(`[${moduleName}] ${message}`, context);
	},
	warn: (message: string, context?: LogContext) => {
		logger.warn(`[${moduleName}] ${message}`, context);
	},
	error: (message: string, error?: Error | unknown, context?: LogContext) => {
		logger.error(`[${moduleName}] ${message}`, error, context);
	},
});





