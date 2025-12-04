/**
 * 修复现有词条的 slug 字段
 * 为没有 slug 的词条生成 slug
 */

import { prisma } from '../lib/db/client';
import { generateUniqueSlug } from '../lib/processing/entryOperations';

async function fixEntrySlugs() {
	console.log('[Fix Entry Slugs] Starting...');

	// 获取所有词条
	const allEntries = await prisma.entry.findMany({
		select: {
			id: true,
			title: true,
			slug: true
		}
	});

	// 过滤出没有 slug 或 slug 为空的词条
	const entries = allEntries.filter(e => !e.slug || e.slug.trim() === '');

	console.log(`[Fix Entry Slugs] Found ${entries.length} entries without slug`);

	let fixed = 0;
	for (const entry of entries) {
		try {
			const newSlug = await generateUniqueSlug(entry.title);
			await prisma.entry.update({
				where: { id: entry.id },
				data: { slug: newSlug }
			});
			console.log(`[Fix Entry Slugs] Fixed entry "${entry.title}" -> slug: "${newSlug}"`);
			fixed++;
		} catch (err: any) {
			console.error(`[Fix Entry Slugs] Failed to fix entry "${entry.title}":`, err.message);
		}
	}

	console.log(`[Fix Entry Slugs] Fixed ${fixed} entries`);
	return { fixed, total: entries.length };
}

// 如果直接运行此脚本
if (require.main === module) {
	fixEntrySlugs()
		.then(() => {
			console.log('[Fix Entry Slugs] Done');
			process.exit(0);
		})
		.catch((err) => {
			console.error('[Fix Entry Slugs] Error:', err);
			process.exit(1);
		});
}

export { fixEntrySlugs };

