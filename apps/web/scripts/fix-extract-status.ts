/**
 * 修复extract状态不一致的问题
 * 运行方式: cd apps/web; npx tsx scripts/fix-extract-status.ts
 */

import { prisma } from '../lib/db/client';
import { updateProcessingStatus } from '../lib/processing/status';

async function fixExtractStatus() {
	console.log('=== 修复extract状态不一致 ===\n');

	try {
		// 找到有extractedText但状态不是completed的文档
		const docsWithText = await prisma.document.findMany({
			where: {
				extractedText: { not: null }
			},
			select: {
				id: true,
				processingStatus: true,
				topic: { select: { title: true } }
			},
			take: 50
		});

		console.log(`找到 ${docsWithText.length} 个有提取文本的文档\n`);

		let fixed = 0;
		for (const doc of docsWithText) {
			const status = (doc.processingStatus as any) || {};
			if (status.extract !== 'completed') {
				console.log(`修复文档 ${doc.id} (${doc.topic.title}):`);
				console.log(`  当前extract状态: ${status.extract || 'null'}`);
				
				try {
					await updateProcessingStatus(doc.id, 'extract', 'completed');
					console.log(`  ✅ 已修复为 completed\n`);
					fixed++;
				} catch (err: any) {
					console.error(`  ❌ 修复失败: ${err.message}\n`);
				}
			}
		}

		console.log(`\n修复完成，共修复 ${fixed} 个文档`);
		
		// 如果有修复的文档，建议重新触发summarize
		if (fixed > 0) {
			console.log('\n建议运行以下命令重新触发总结：');
			console.log('npx tsx scripts/fix-stuck-documents.ts');
		}

	} catch (err: any) {
		console.error('修复失败:', err);
		console.error(err.stack);
	} finally {
		await prisma.$disconnect();
	}
}

fixExtractStatus();



