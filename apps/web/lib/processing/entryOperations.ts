/**
 * 词条操作
 * 处理词条的创建、更新和查询
 */

import { prisma } from '@/lib/db/client';
import { TRACE_PROCESSING_CONFIG } from '@/lib/config/trace-processing';
import { logAudit } from '@/lib/audit/logger';

/**
 * 生成唯一slug
 * @param title 标题
 * @param retries 重试次数（默认5次）
 * @returns 唯一slug
 */
export async function generateUniqueSlug(title: string, retries: number = 5): Promise<string> {
	// 生成基础slug：转小写、替换空格为连字符、移除特殊字符
	const baseSlug = title
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w\-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

	let slug = baseSlug;
	let attempt = 0;

	while (attempt < retries) {
		const existing = await prisma.entry.findUnique({
			where: { slug },
			select: { id: true }
		});

		if (!existing) {
			return slug;
		}

		// 如果已存在，添加数字后缀
		attempt++;
		slug = `${baseSlug}-${attempt}`;
	}

	// 如果重试后仍然冲突，使用时间戳
	return `${baseSlug}-${Date.now()}`;
}

/**
 * 从溯源创建词条（在事务中）
 * @param traceId 溯源ID
 * @param tx 事务对象
 * @returns 创建的词条
 */
export async function createEntryFromTrace(
	traceId: string,
	tx: any
): Promise<any> {
	// 获取溯源
	const trace = await tx.trace.findUnique({
		where: { id: traceId },
		include: {
			citationsList: {
				orderBy: { order: 'asc' }
			},
			analysis: true
		}
	});

	if (!trace) {
		throw new Error('溯源不存在');
	}

	if (trace.status !== 'PUBLISHED') {
		throw new Error('只能采纳已发布的溯源');
	}

	// 检查是否已有词条
	const existingEntry = await tx.entry.findUnique({
		where: { sourceTraceId: traceId },
		select: { id: true }
	});

	if (existingEntry) {
		throw new Error('该溯源已被采纳');
	}

	// 生成slug
	const slug = await generateUniqueSlug(trace.title);

	// 创建词条
	const entry = await tx.entry.create({
		data: {
			title: trace.title,
			slug,
			traceType: trace.traceType,
			content: trace.body, // 使用溯源正文
			citations: trace.citationsList.map((c: any) => ({
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
			})),
			sourceTraceId: traceId,
			version: 1
		}
	});

	// 更新溯源状态为APPROVED
	await tx.trace.update({
		where: { id: traceId },
		data: {
			status: 'APPROVED',
			approvedAt: new Date(),
			entryId: entry.id
		}
	});

	return entry;
}

/**
 * 采纳溯源（使用事务，确保原子性）
 * @param traceId 溯源ID
 * @param userId 用户ID（用于审计日志）
 * @returns 创建的词条
 */
export async function approveTrace(traceId: string, userId: string): Promise<any> {
	// 使用事务确保原子性
	const entry = await prisma.$transaction(
		async (tx) => {
			return await createEntryFromTrace(traceId, tx);
		},
		{
			isolationLevel: 'Serializable',
			timeout: 10000 // 10秒超时
		}
	);

	// 清除缓存
	const { invalidateTraceCache, invalidateEntryCache } = await import('@/lib/cache/traceCache');
	await invalidateTraceCache(traceId);
	await invalidateEntryCache(entry.slug);

	// 记录审计日志
	await logAudit({
		userId,
		action: 'trace.approve',
		resourceType: 'trace',
		resourceId: traceId,
		metadata: { entryId: entry.id, slug: entry.slug }
	});

	return entry;
}

/**
 * 更新词条
 * @param entryId 词条ID
 * @param data 更新数据
 * @param userId 用户ID（用于审计日志）
 * @returns 更新后的词条
 */
export async function updateEntry(
	entryId: string,
	data: {
		content?: string;
		citations?: any[];
		needsUpdate?: boolean;
		updateReason?: string;
	},
	userId: string
): Promise<any> {
	const entry = await prisma.entry.findUnique({
		where: { id: entryId },
		select: { version: true }
	});

	if (!entry) {
		throw new Error('词条不存在');
	}

	const updated = await prisma.entry.update({
		where: { id: entryId },
		data: {
			...(data.content && { content: data.content }),
			...(data.citations && { citations: data.citations as any }),
			...(data.needsUpdate !== undefined && { needsUpdate: data.needsUpdate }),
			...(data.updateReason && { updateReason: data.updateReason }),
			version: entry.version + 1,
			previousVersionId: entryId
		},
		select: { slug: true, version: true }
	});

	// 清除缓存
	const { invalidateEntryCache } = await import('@/lib/cache/traceCache');
	await invalidateEntryCache(updated.slug);

	// 记录审计日志
	await logAudit({
		userId,
		action: 'entry.update',
		resourceType: 'entry',
		resourceId: entryId,
		metadata: { version: updated.version }
	});

	// 重新获取完整数据
	const fullEntry = await prisma.entry.findUnique({
		where: { id: entryId },
		include: {
			sourceTrace: {
				select: {
					id: true,
					title: true,
					editor: {
						select: { id: true, email: true, name: true }
					}
				}
			}
		}
	});

	return fullEntry!;
}

/**
 * 获取词条（带缓存）
 * @param slug 词条slug
 * @returns 词条详情
 */
export async function getEntry(slug: string): Promise<any> {
	// 尝试从缓存获取
	const { getEntry: getCachedEntry, setEntry: setCachedEntry } = await import('@/lib/cache/traceCache');
	const cached = await getCachedEntry(slug);
	if (cached) {
		return cached;
	}

	// 从数据库获取
	const entry = await prisma.entry.findUnique({
		where: { slug },
		include: {
			sourceTrace: {
				select: {
					id: true,
					title: true,
					editor: {
						select: { id: true, email: true, name: true }
					}
				}
			}
		}
	});

	if (!entry) {
		throw new Error('词条不存在');
	}

	// 存入缓存
	await setCachedEntry(slug, entry);

	return entry;
}

