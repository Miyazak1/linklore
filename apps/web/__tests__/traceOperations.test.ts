/**
 * 溯源操作单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTrace, updateTrace, deleteTrace, getTrace } from '@/lib/processing/traceOperations';
import { prisma } from '@/lib/db/client';

// Mock Prisma
vi.mock('@/lib/db/client', () => ({
	prisma: {
		trace: {
			create: vi.fn(),
			findUnique: vi.fn(),
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

// Mock 其他依赖
vi.mock('@/lib/auth/permissions', () => ({
	checkTraceOwnership: vi.fn((traceId, userId, role) => {
		return role === 'admin' || role === 'editor';
	})
}));

vi.mock('@/lib/validation/traceValidation', () => ({
	TraceSchema: {
		parse: vi.fn((data) => data)
	},
	validateTraceForPublish: vi.fn(() => ({ valid: true, errors: [] }))
}));

vi.mock('@/lib/audit/logger', () => ({
	logAudit: vi.fn()
}));

vi.mock('@/lib/cache/traceCache', () => ({
	invalidateTraceCache: vi.fn()
}));

describe('traceOperations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createTrace', () => {
		it('应该成功创建溯源', async () => {
			const mockTrace = {
				id: 'trace-1',
				title: '测试溯源',
				traceType: 'CONCEPT',
				target: '测试目标',
				body: '测试正文',
				status: 'DRAFT',
				version: 1,
				editorId: 'user-1'
			};

			const mockCitation = {
				id: 'citation-1',
				traceId: 'trace-1',
				title: '测试引用',
				order: 1
			};

			(prisma.$transaction as any).mockResolvedValue({
				trace: mockTrace,
				citations: [mockCitation]
			});

			const data = {
				title: '测试溯源',
				traceType: 'CONCEPT' as const,
				target: '测试目标',
				body: '测试正文',
				citations: [
					{
						title: '测试引用',
						type: 'web' as const
					}
				]
			};

			const result = await createTrace(data, 'user-1');

			expect(result).toEqual(mockTrace);
			expect(prisma.$transaction).toHaveBeenCalled();
		});
	});

	describe('updateTrace', () => {
		it('应该成功更新溯源', async () => {
			const mockTrace = {
				editorId: 'user-1',
				status: 'DRAFT' as const,
				version: 1
			};

			const mockUpdatedTrace = {
				id: 'trace-1',
				title: '更新后的标题',
				version: 2
			};

			(prisma.trace.findUnique as any).mockResolvedValue(mockTrace);
			(prisma.user.findUnique as any).mockResolvedValue({ role: 'editor' });
			(prisma.$transaction as any).mockResolvedValue(mockUpdatedTrace);

			const data = {
				title: '更新后的标题',
				version: 1
			};

			const result = await updateTrace('trace-1', data, 'user-1');

			expect(result).toEqual(mockUpdatedTrace);
			expect(prisma.trace.findUnique).toHaveBeenCalledWith({
				where: { id: 'trace-1' },
				select: { editorId: true, status: true, version: true }
			});
		});

		it('应该检测版本冲突', async () => {
			const mockTrace = {
				editorId: 'user-1',
				status: 'DRAFT' as const,
				version: 2 // 服务器版本是2
			};

			(prisma.trace.findUnique as any).mockResolvedValue(mockTrace);
			(prisma.user.findUnique as any).mockResolvedValue({ role: 'editor' });

			const data = {
				title: '更新后的标题',
				version: 1 // 客户端版本是1，不匹配
			};

			await expect(updateTrace('trace-1', data, 'user-1')).rejects.toThrow('溯源已被其他用户修改');
		});
	});

	describe('deleteTrace', () => {
		it('应该成功删除溯源', async () => {
			const mockTrace = {
				editorId: 'user-1',
				status: 'DRAFT' as const,
				entryId: null
			};

			(prisma.trace.findUnique as any).mockResolvedValue(mockTrace);
			(prisma.user.findUnique as any).mockResolvedValue({ role: 'editor' });
			(prisma.trace.delete as any).mockResolvedValue({});

			await deleteTrace('trace-1', 'user-1');

			expect(prisma.trace.delete).toHaveBeenCalledWith({
				where: { id: 'trace-1' }
			});
		});

		it('不应该删除已采纳的溯源', async () => {
			const mockTrace = {
				editorId: 'user-1',
				status: 'APPROVED' as const,
				entryId: 'entry-1'
			};

			(prisma.trace.findUnique as any).mockResolvedValue(mockTrace);
			(prisma.user.findUnique as any).mockResolvedValue({ role: 'editor' });

			await expect(deleteTrace('trace-1', 'user-1')).rejects.toThrow('已采纳的溯源不能删除');
		});
	});

	describe('getTrace', () => {
		it('应该成功获取溯源', async () => {
			const mockTrace = {
				id: 'trace-1',
				title: '测试溯源',
				status: 'PUBLISHED' as const,
				editorId: 'user-1',
				editor: { id: 'user-1', email: 'test@example.com' },
				analysis: null,
				citationsList: [],
				entry: null
			};

			(prisma.trace.findUnique as any).mockResolvedValue(mockTrace);

			const result = await getTrace('trace-1', 'user-1');

			expect(result).toEqual(mockTrace);
		});

		it('不应该允许非所有者查看草稿', async () => {
			const mockTrace = {
				id: 'trace-1',
				title: '测试溯源',
				status: 'DRAFT' as const,
				editorId: 'user-1',
				editor: { id: 'user-1', email: 'test@example.com' },
				analysis: null,
				citationsList: [],
				entry: null
			};

			(prisma.trace.findUnique as any).mockResolvedValue(mockTrace);
			(prisma.user.findUnique as any).mockResolvedValue({ role: 'member' });

			await expect(getTrace('trace-1', 'user-2')).rejects.toThrow('无权限查看此溯源');
		});
	});
});

