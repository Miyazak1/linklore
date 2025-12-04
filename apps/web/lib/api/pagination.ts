/**
 * 分页工具
 */

export interface PaginationParams {
	page: number;
	pageSize: number;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

/**
 * 解析分页参数
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
	const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
	const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
	const sortBy = searchParams.get('sortBy') || undefined;
	const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

	return { page, pageSize, sortBy, sortOrder };
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
	data: T[],
	total: number,
	page: number,
	pageSize: number
): PaginatedResponse<T> {
	const totalPages = Math.ceil(total / pageSize);

	return {
		data,
		total,
		page,
		pageSize,
		totalPages,
		hasNext: page < totalPages,
		hasPrev: page > 1
	};
}

