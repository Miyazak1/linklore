/**
 * 溯源CRUD操作
 * 集成权限检查、状态管理和审计日志
 */

import { prisma } from '@/lib/db/client';
import { requireEditor, checkTraceOwnership } from '@/lib/auth/permissions';
import { updateTraceStatus } from './traceStateMachine';
import { TraceSchema, validateTraceForPublish } from '@/lib/validation/traceValidation';
import { logAudit } from '@/lib/audit/logger';
import type { TraceType, TraceStatus } from '@prisma/client';

export interface CreateTraceData {
	title: string;
	traceType: TraceType;
	target: string;
	body: string;
	citations: Array<{
		url?: string;
		title: string;
		author?: string;
		publisher?: string;
		year?: number;
		type: 'web' | 'book' | 'paper' | 'journal' | 'other';
		quote?: string;
		page?: string;
		order?: number;
	}>;
}

export interface UpdateTraceData {
	title?: string;
	traceType?: TraceType;
	target?: string;
	body?: string;
	citations?: CreateTraceData['citations'];
	version?: number;
}

/**
 * 创建溯源
 * @param data 溯源数据
 * @param editorId 编辑ID（已通过权限检查）
 * @returns 创建的溯源
 */
export async function createTrace(data: CreateTraceData, editorId: string) {
	// 验证数据
	const validated = TraceSchema.parse(data);

	// 创建溯源和引用（使用事务）
	const trace = await prisma.$transaction(async (tx) => {
		// 创建溯源
		const newTrace = await tx.trace.create({
			data: {
				editorId,
				title: validated.title,
				traceType: validated.traceType,
				target: validated.target,
				body: validated.body,
				citations: validated.citations as any, // JSON字段
				status: 'DRAFT',
				version: 1
			}
		});

		// 创建引用记录
		const citations = await Promise.all(
			validated.citations.map((citation, idx) =>
				tx.citation.create({
					data: {
						traceId: newTrace.id,
						url: citation.url || null,
						title: citation.title,
						author: citation.author || null,
						publisher: citation.publisher || null,
						year: citation.year || null,
						type: citation.type,
						quote: citation.quote || null,
						page: citation.page || null,
						order: citation.order || idx + 1,
						bodyRefs: [] // 初始为空，后续编辑时更新
					}
				})
			)
		);

		return { trace: newTrace, citations };
	});

	// 记录审计日志
	await logAudit({
		userId: editorId,
		action: 'trace.create',
		resourceType: 'trace',
		resourceId: trace.trace.id,
		metadata: { title: validated.title, traceType: validated.traceType }
	});

	return trace.trace;
}

/**
 * 更新溯源
 * @param traceId 溯源ID
 * @param data 更新数据
 * @param userId 用户ID
 * @returns 更新后的溯源
 */
export async function updateTrace(traceId: string, data: UpdateTraceData, userId: string) {
	// 获取当前溯源
	const trace = await prisma.trace.findUnique({
		where: { id: traceId },
		select: { editorId: true, status: true, version: true }
	});

	if (!trace) {
		throw new Error('溯源不存在');
	}

	// 检查权限
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true }
	});

	if (!checkTraceOwnership(traceId, userId, user?.role || 'member')) {
		throw new Error('无权限修改此溯源');
	}

	// 检查版本（乐观锁）
	if (data.version !== undefined && data.version !== trace.version) {
		const error: any = new Error('溯源已被其他用户修改，请刷新后重试');
		error.code = 'CONFLICT';
		error.statusCode = 409;
		throw error;
	}

	// 如果更新了内容，需要重新验证
	if (data.body || data.citations) {
		const currentTrace = await prisma.trace.findUnique({
			where: { id: traceId },
			select: { body: true, citations: true }
		});

		const updatedBody = data.body ?? currentTrace?.body ?? '';
		const updatedCitations = data.citations ?? (currentTrace?.citations as any) ?? [];

		const validation = validateTraceForPublish({
			body: updatedBody,
			citations: updatedCitations
		});

		// 如果是草稿状态，允许验证失败（可以保存不完整的草稿）
		// 如果是已发布状态，不允许验证失败
		if (trace.status !== 'DRAFT' && !validation.valid) {
			throw new Error(`验证失败：${validation.errors.join(', ')}`);
		}
	}

	// 更新溯源（使用事务）
	const updated = await prisma.$transaction(async (tx) => {
		// 如果更新了引用，先处理引用关系字段
		let citationsJson: any[] | undefined;
		if (data.citations) {
			// 删除旧引用
			await tx.citation.deleteMany({
				where: { traceId }
			});

			// 创建新引用
			const newCitations = await Promise.all(
				data.citations.map((citation, idx) =>
					tx.citation.create({
						data: {
							traceId,
							url: citation.url || null,
							title: citation.title,
							author: citation.author || null,
							publisher: citation.publisher || null,
							year: citation.year || null,
							type: citation.type,
							quote: citation.quote || null,
							page: citation.page || null,
							order: citation.order || idx + 1,
							bodyRefs: []
						}
					})
				)
			);
			
			// 从关系字段生成 JSON 字段，确保数据一致性
			citationsJson = newCitations.map((c) => ({
				id: c.id,
				url: c.url,
				title: c.title,
				author: c.author,
				publisher: c.publisher,
				year: c.year,
				type: c.type,
				quote: c.quote,
				page: c.page,
				order: c.order
			}));
		}

		// 更新溯源
		// previousVersionId 逻辑说明：
		// 由于版本号递增但ID不变，previousVersionId 的设计存在局限性
		// 当前实现：只在首次更新（version 1 -> 2）时设置 previousVersionId = null
		// 后续更新不改变 previousVersionId，因为ID不变，无法真正指向"上一版本"
		// 注意：如果需要真正的版本历史，应该考虑创建新记录（新ID）而不是更新现有记录
		const updateData: any = {
			...(data.title && { title: data.title }),
			...(data.traceType && { traceType: data.traceType }),
			...(data.target && { target: data.target }),
			...(data.body && { body: data.body }),
			// 如果更新了引用，使用从关系字段生成的 JSON（确保一致性）
			// 否则使用传入的 citations（如果没有更新引用，保持原值）
			...(citationsJson !== undefined 
				? { citations: citationsJson as any }
				: data.citations !== undefined 
					? { citations: data.citations as any }
					: {}
			),
			version: trace.version + 1
		};
		
		// 只在首次更新时设置 previousVersionId = null（表示这是第一次更新，没有上一版本）
		// 后续更新不改变 previousVersionId，因为ID不变，无法真正指向"上一版本"
		if (trace.version === 1) {
			updateData.previousVersionId = null;
		}
		
		const updatedTrace = await tx.trace.update({
			where: { id: traceId },
			data: updateData
		});

		return updatedTrace;
	});

	// 清除缓存
	const { invalidateTraceCache } = await import('@/lib/cache/traceCache');
	await invalidateTraceCache(traceId);

	// 记录审计日志
	await logAudit({
		userId,
		action: 'trace.update',
		resourceType: 'trace',
		resourceId: traceId,
		metadata: { version: updated.version }
	});

	return updated;
}

/**
 * 删除溯源
 * @param traceId 溯源ID
 * @param userId 用户ID
 */
export async function deleteTrace(traceId: string, userId: string) {
	// 获取溯源
	const trace = await prisma.trace.findUnique({
		where: { id: traceId },
		select: { editorId: true, status: true, entryId: true }
	});

	if (!trace) {
		throw new Error('溯源不存在');
	}

	// 检查权限
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true }
	});

	if (!checkTraceOwnership(traceId, userId, user?.role || 'member')) {
		throw new Error('无权限删除此溯源');
	}

	// 如果已采纳，不允许删除
	if (trace.status === 'APPROVED' || trace.entryId) {
		throw new Error('已采纳的溯源不能删除');
	}

	// 删除溯源（级联删除引用）
	await prisma.trace.delete({
		where: { id: traceId }
	});

	// 清除缓存
	const { invalidateTraceCache } = await import('@/lib/cache/traceCache');
	await invalidateTraceCache(traceId);

	// 记录审计日志
	await logAudit({
		userId,
		action: 'trace.delete',
		resourceType: 'trace',
		resourceId: traceId
	});
}

/**
 * 获取溯源
 * @param traceId 溯源ID
 * @param userId 可选的用户ID（用于权限检查）
 * @returns 溯源详情
 */
export async function getTrace(traceId: string, userId?: string) {
	const trace = await prisma.trace.findUnique({
		where: { id: traceId },
		include: {
			editor: {
				select: { id: true, email: true, name: true }
			},
			analysis: true,
			citationsList: {
				orderBy: { order: 'asc' }
			},
			entry: {
				select: { id: true, slug: true, title: true }
			}
		}
	});

	if (!trace) {
		throw new Error('溯源不存在');
	}

	// 权限检查：只有编辑或管理员可以查看未发布的溯源
	if (trace.status === 'DRAFT' && userId) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { role: true }
		});

		if (trace.editorId !== userId && user?.role !== 'admin') {
			throw new Error('无权限查看此溯源');
		}
	}

	return trace;
}

