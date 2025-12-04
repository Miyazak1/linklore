/**
 * 引用管理逻辑
 * 处理引用的增删改查，确保引用编号的唯一性和顺序
 */

import { prisma } from '@/lib/db/client';
import type { Prisma } from '@prisma/client';

export interface CitationData {
	url?: string;
	title: string;
	author?: string;
	publisher?: string;
	year?: number;
	type: 'web' | 'book' | 'paper' | 'journal' | 'other';
	quote?: string;
	page?: string;
	bodyRefs?: string[];
}

/**
 * 获取下一个引用编号（事务安全）
 * @param traceId 溯源ID
 * @param tx 事务对象（可选）
 * @returns 下一个引用编号
 */
export async function getNextCitationNumber(
	traceId: string,
	tx?: Prisma.TransactionClient
): Promise<number> {
	const client = tx || prisma;

	const maxCitation = await client.citation.findFirst({
		where: { traceId },
		orderBy: { order: 'desc' },
		select: { order: true }
	});

	return (maxCitation?.order ?? 0) + 1;
}

/**
 * 插入引用
 * @param traceId 溯源ID
 * @param citation 引用数据
 * @param position 插入位置（可选，默认追加到末尾）
 * @returns 创建的引用
 */
export async function insertCitation(
	traceId: string,
	citation: CitationData,
	position?: number
): Promise<any> {
	return await prisma.$transaction(async (tx) => {
		// 如果指定了位置，需要调整后续引用的order
		if (position !== undefined) {
			await tx.citation.updateMany({
				where: {
					traceId,
					order: { gte: position }
				},
				data: {
					order: { increment: 1 }
				}
			});
		}

		// 获取新的order值
		const order = position ?? (await getNextCitationNumber(traceId, tx));

		// 创建引用
		const newCitation = await tx.citation.create({
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
				order,
				bodyRefs: citation.bodyRefs || []
			}
		});

		// 更新Trace中的citations JSON字段（冗余存储）
		const allCitations = await tx.citation.findMany({
			where: { traceId },
			orderBy: { order: 'asc' }
		});

		await tx.trace.update({
			where: { id: traceId },
			data: {
				citations: allCitations.map((c) => ({
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
				}))
			}
		});

		return newCitation;
	});
}

/**
 * 更新引用
 * @param citationId 引用ID
 * @param data 更新数据
 * @returns 更新后的引用
 */
export async function updateCitation(citationId: string, data: Partial<CitationData>): Promise<any> {
	return await prisma.$transaction(async (tx) => {
		// 获取引用
		const citation = await tx.citation.findUnique({
			where: { id: citationId },
			select: { traceId: true }
		});

		if (!citation) {
			throw new Error('引用不存在');
		}

		// 更新引用
		const updated = await tx.citation.update({
			where: { id: citationId },
			data: {
				...(data.url !== undefined && { url: data.url || null }),
				...(data.title !== undefined && { title: data.title }),
				...(data.author !== undefined && { author: data.author || null }),
				...(data.publisher !== undefined && { publisher: data.publisher || null }),
				...(data.year !== undefined && { year: data.year || null }),
				...(data.type !== undefined && { type: data.type }),
				...(data.quote !== undefined && { quote: data.quote || null }),
				...(data.page !== undefined && { page: data.page || null }),
				...(data.bodyRefs !== undefined && { bodyRefs: data.bodyRefs })
			}
		});

		// 更新Trace中的citations JSON字段
		const allCitations = await tx.citation.findMany({
			where: { traceId: citation.traceId },
			orderBy: { order: 'asc' }
		});

		await tx.trace.update({
			where: { id: citation.traceId },
			data: {
				citations: allCitations.map((c) => ({
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
				}))
			}
		});

		return updated;
	});
}

/**
 * 删除引用
 * @param citationId 引用ID
 */
export async function deleteCitation(citationId: string): Promise<void> {
	await prisma.$transaction(async (tx) => {
		// 获取引用
		const citation = await tx.citation.findUnique({
			where: { id: citationId },
			select: { traceId: true, order: true }
		});

		if (!citation) {
			throw new Error('引用不存在');
		}

		// 删除引用
		await tx.citation.delete({
			where: { id: citationId }
		});

		// 调整后续引用的order
		await tx.citation.updateMany({
			where: {
				traceId: citation.traceId,
				order: { gt: citation.order }
			},
			data: {
				order: { decrement: 1 }
			}
		});

		// 更新Trace中的citations JSON字段
		const allCitations = await tx.citation.findMany({
			where: { traceId: citation.traceId },
			orderBy: { order: 'asc' }
		});

		await tx.trace.update({
			where: { id: citation.traceId },
			data: {
				citations: allCitations.map((c) => ({
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
				}))
			}
		});
	});
}

