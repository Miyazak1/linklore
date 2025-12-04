/**
 * Centralized error logging utility
 * Logs errors to console and optionally to Sentry
 */

export function logError(error: Error | unknown, context?: Record<string, any>) {
	const errorObj = error instanceof Error ? error : new Error(String(error));
	
	// Always log to console
	console.error('[Error]', errorObj.message, context || '');
	
	// Log to Sentry if available
	if (typeof window !== 'undefined' && (window as any).Sentry) {
		(window as any).Sentry.captureException(errorObj, {
			contexts: {
				custom: context || {},
			},
		});
	}
}

export function logWarning(message: string, context?: Record<string, any>) {
	console.warn('[Warning]', message, context || '');
	
	if (typeof window !== 'undefined' && (window as any).Sentry) {
		(window as any).Sentry.captureMessage(message, {
			level: 'warning',
			contexts: {
				custom: context || {},
			},
		});
	}
}

export function logInfo(message: string, context?: Record<string, any>) {
	console.log('[Info]', message, context || '');
}










