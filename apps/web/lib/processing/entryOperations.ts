/**
 * 词条操作
 * 处理词条的创建、更新和查询
 */

import { prisma } from '@/lib/db/client';
import { logAudit } from '@/lib/audit/logger';

/**
 * 生成唯一slug
 * @param title 标题
 * @param retries 重试次数（默认5次）
 * @param tx 事务对象（可选，如果提供则使用事务查询）
 * @returns 唯一slug
 */
export async function generateUniqueSlug(
	title: string, 
	retries: number = 5,
	tx?: any
): Promise<string> {
	// 生成基础slug：转小写、替换空格为连字符、移除特殊字符
	const baseSlug = title
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w\-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

	// 如果 baseSlug 为空，使用默认值
	if (!baseSlug || baseSlug.length === 0) {
		return `entry-${Date.now()}`;
	}

	let slug = baseSlug;
	let attempt = 0;
	const client = tx || prisma;

	while (attempt < retries) {
		const existing = await client.entry.findUnique({
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

// 语义溯源功能已移除

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

	// 缓存功能已移除

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
		where: { id: entryId }
	});

	return fullEntry!;
}

/**
 * 获取词条（带缓存）
 * @param slug 词条slug
 * @returns 词条详情
 */
export async function getEntry(slug: string): Promise<any> {
	// 从数据库获取
	const entry = await prisma.entry.findUnique({
		where: { slug }
	});

	if (!entry) {
		throw new Error('词条不存在');
	}

	return entry;
}

