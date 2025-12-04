import { prisma } from '@/lib/db/client';

/**
 * 迁移已有文档：设置 parentId 和 processingStatus
 */
export async function fixExistingDocuments() {
	console.log('[Migration] Starting fix for existing documents...');

	// 获取所有文档
	const docs = await prisma.document.findMany({
		select: {
			id: true,
			topicId: true,
			parentId: true,
			processingStatus: true,
			extractedText: true,
			summaries: { take: 1 },
			evaluations: { take: 1 }
		}
	});

	console.log(`[Migration] Found ${docs.length} documents to process`);

	let updated = 0;

	for (const doc of docs) {
		const updates: any = {};

		// 设置 parentId（如果为 null，保持为 null，表示是主题文档）
		if (doc.parentId === undefined) {
			updates.parentId = null;
		}

		// 初始化 processingStatus
		if (!doc.processingStatus) {
			const status: any = {};
			
			// 根据现有数据推断状态
			if (doc.extractedText) {
				status.extract = 'completed';
			} else {
				status.extract = 'pending';
			}

			if (doc.summaries && doc.summaries.length > 0) {
				status.summarize = 'completed';
			} else {
				status.summarize = doc.extractedText ? 'pending' : 'pending';
			}

			if (doc.evaluations && doc.evaluations.length > 0) {
				status.evaluate = 'completed';
			} else {
				status.evaluate = (doc.summaries && doc.summaries.length > 0) ? 'pending' : 'pending';
			}

			updates.processingStatus = status;
		}

		if (Object.keys(updates).length > 0) {
			await prisma.document.update({
				where: { id: doc.id },
				data: updates
			});
			updated++;
		}
	}

	console.log(`[Migration] Updated ${updated} documents`);
	return { updated, total: docs.length };
}

// 如果直接运行此脚本
if (require.main === module) {
	fixExistingDocuments()
		.then(result => {
			console.log('Migration completed:', result);
			process.exit(0);
		})
		.catch(err => {
			console.error('Migration failed:', err);
			process.exit(1);
		});
}








