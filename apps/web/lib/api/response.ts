/**
 * 统一API响应格式
 */

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: any;
	};
	meta?: {
		timestamp: string;
		requestId?: string;
		[key: string]: any;
	};
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(
	data: T,
	meta?: Record<string, any>
): ApiResponse<T> {
	return {
		success: true,
		data,
		meta: {
			timestamp: new Date().toISOString(),
			...meta
		}
	};
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
	code: string,
	message: string,
	status: number = 400,
	details?: any
): { response: ApiResponse; status: number } {
	return {
		response: {
			success: false,
			error: {
				code,
				message,
				details: process.env.NODE_ENV === 'production' ? undefined : details
			},
			meta: {
				timestamp: new Date().toISOString()
			}
		},
		status
	};
}

/**
 * 处理错误
 */
export function handleError(err: any, context?: string): { response: ApiResponse; status: number } {
	console.error(`[API Error]${context ? ` ${context}:` : ''}`, err);

	// 已知错误类型
	if (err instanceof Error) {
		// 权限错误
		if (err.message.includes('权限') || err.message.includes('无权限')) {
			return createErrorResponse('PERMISSION_DENIED', err.message, 403);
		}

		// 验证错误
		if (err.message.includes('验证') || err.name === 'ZodError') {
			return createErrorResponse('VALIDATION_ERROR', err.message, 400, err);
		}

		// 未找到
		if (err.message.includes('不存在') || err.message.includes('not found')) {
			return createErrorResponse('NOT_FOUND', err.message, 404);
		}

		// 冲突
		if (err.message.includes('冲突') || err.message.includes('已存在')) {
			return createErrorResponse('CONFLICT', err.message, 409);
		}
	}

	// 默认错误
	return createErrorResponse(
		'INTERNAL_ERROR',
		process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
		500,
		process.env.NODE_ENV === 'production' ? undefined : err
	);
}

