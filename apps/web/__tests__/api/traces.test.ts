/**
 * 溯源API集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

// Mock 依赖
vi.mock('@/lib/auth/session');
vi.mock('@/lib/db/client', () => ({
	prisma: {
		trace: {
			findMany: vi.fn(),
			count: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		},
		citation: {
			create: vi.fn(),
			deleteMany: vi.fn()
		},
		$transaction: vi.fn(),
		user: {
			findUnique: vi.fn()
		}
	}
}));

vi.mock('@/lib/processing/traceOperations', () => ({
	createTrace: vi.fn(),
	updateTrace: vi.fn(),
	deleteTrace: vi.fn(),
	getTrace: vi.fn()
}));

const { requireEditor } = await import('@/lib/auth/permissions');
vi.mock('@/lib/auth/permissions', () => ({
	requireEditor: vi.fn(),
	checkOwnership: vi.fn()
}));

describe('Traces API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/traces', () => {
		it('应该返回溯源列表', async () => {
			const { requireEditor } = await import('@/lib/auth/permissions');
			const mockUser = { id: 'user-1', email: 'test@example.com', role: 'editor' };
			(readSession as any).mockResolvedValue({ sub: 'user-1' });
			(requireEditor as any).mockResolvedValue(mockUser);

			const mockTraces = [
				{
					id: 'trace-1',
					title: '测试溯源1',
					status: 'DRAFT',
					editorId: 'user-1'
				}
			];

			(prisma.trace.findMany as any).mockResolvedValue(mockTraces);
			(prisma.trace.count as any).mockResolvedValue(1);

			const { GET } = await import('@/app/api/traces/route');
			const request = new Request('http://localhost:3000/api/traces?page=1&pageSize=20');
			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data.data).toHaveLength(1);
		});

		it('应该拒绝未认证的请求', async () => {
			const { GET } = await import('@/app/api/traces/route');
			const { requireEditor } = await import('@/lib/auth/permissions');
			(readSession as any).mockResolvedValue(null);
			(requireEditor as any).mockRejectedValue(new Error('未登录'));

			const request = new Request('http://localhost:3000/api/traces');
			const response = await GET(request);

			expect(response.status).toBe(403);
		});
	});

	describe('POST /api/traces', () => {
		it('应该成功创建溯源', async () => {
			const { POST } = await import('@/app/api/traces/route');
			const { requireEditor } = await import('@/lib/auth/permissions');
			const mockUser = { id: 'user-1', email: 'test@example.com', role: 'editor' };
			(readSession as any).mockResolvedValue({ sub: 'user-1' });
			(requireEditor as any).mockResolvedValue(mockUser);

			const mockTrace = {
				id: 'trace-1',
				title: '新溯源',
				status: 'DRAFT',
				version: 1
			};

			const { createTrace } = await import('@/lib/processing/traceOperations');
			(createTrace as any).mockResolvedValue(mockTrace);

			const request = new Request('http://localhost:3000/api/traces', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: '新溯源',
					traceType: 'CONCEPT',
					target: '测试目标',
					body: '测试正文内容',
					citations: []
				})
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data.id).toBe('trace-1');
		});
	});

	describe('GET /api/traces/[id]', () => {
		it('应该返回溯源详情', async () => {
			const { GET: GET_DETAIL } = await import('@/app/api/traces/[id]/route');
			const mockUser = { id: 'user-1', email: 'test@example.com', role: 'editor' };
			(readSession as any).mockResolvedValue({ sub: 'user-1' });

			const mockTrace = {
				id: 'trace-1',
				title: '测试溯源',
				status: 'DRAFT',
				editorId: 'user-1',
				editor: mockUser,
				analysis: null,
				citationsList: [],
				entry: null
			};

			const { getTrace } = await import('@/lib/processing/traceOperations');
			(getTrace as any).mockResolvedValue(mockTrace);

			const request = new Request('http://localhost:3000/api/traces/trace-1');
			const response = await GET_DETAIL(request, { params: Promise.resolve({ id: 'trace-1' }) });
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data.id).toBe('trace-1');
		});
	});

	describe('PUT /api/traces/[id]', () => {
		it('应该成功更新溯源', async () => {
			const { PUT: PUT_DETAIL } = await import('@/app/api/traces/[id]/route');
			const mockUser = { id: 'user-1', email: 'test@example.com', role: 'editor' };
			(readSession as any).mockResolvedValue({ sub: 'user-1' });

			const mockUpdatedTrace = {
				id: 'trace-1',
				title: '更新后的标题',
				version: 2
			};

			const { updateTrace } = await import('@/lib/processing/traceOperations');
			(updateTrace as any).mockResolvedValue(mockUpdatedTrace);

			const request = new Request('http://localhost:3000/api/traces/trace-1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: '更新后的标题',
					version: 1
				})
			});

			const response = await PUT_DETAIL(request, { params: Promise.resolve({ id: 'trace-1' }) });
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data.title).toBe('更新后的标题');
		});

		it('应该检测版本冲突', async () => {
			const { PUT: PUT_DETAIL } = await import('@/app/api/traces/[id]/route');
			const mockUser = { id: 'user-1', email: 'test@example.com', role: 'editor' };
			(readSession as any).mockResolvedValue({ sub: 'user-1' });

			const conflictError: any = new Error('溯源已被其他用户修改，请刷新后重试');
			conflictError.code = 'CONFLICT';
			conflictError.statusCode = 409;

			const { updateTrace } = await import('@/lib/processing/traceOperations');
			(updateTrace as any).mockRejectedValue(conflictError);

			const request = new Request('http://localhost:3000/api/traces/trace-1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: '更新后的标题',
					version: 1
				})
			});

			const response = await PUT_DETAIL(request, { params: Promise.resolve({ id: 'trace-1' }) });
			const data = await response.json();

			expect(response.status).toBe(409);
			expect(data.success).toBe(false);
			expect(data.error.code).toBe('CONFLICT');
		});
	});

	describe('DELETE /api/traces/[id]', () => {
		it('应该成功删除溯源', async () => {
			const { DELETE: DELETE_DETAIL } = await import('@/app/api/traces/[id]/route');
			const mockUser = { id: 'user-1', email: 'test@example.com', role: 'editor' };
			(readSession as any).mockResolvedValue({ sub: 'user-1' });

			const { deleteTrace } = await import('@/lib/processing/traceOperations');
			(deleteTrace as any).mockResolvedValue(undefined);

			const request = new Request('http://localhost:3000/api/traces/trace-1', {
				method: 'DELETE'
			});

			const response = await DELETE_DETAIL(request, { params: Promise.resolve({ id: 'trace-1' }) });
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data.deleted).toBe(true);
		});
	});
});

