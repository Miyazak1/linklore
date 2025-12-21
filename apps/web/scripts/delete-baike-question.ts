/**
 * 删除指定日期的百科题目
 * 用于测试或重置题目
 * 
 * 使用方法：
 * pnpm tsx scripts/delete-baike-question.ts [date]
 * 
 * 示例：
 * pnpm tsx scripts/delete-baike-question.ts 20251219
 * pnpm tsx scripts/delete-baike-question.ts  # 删除今天的题目
 */

import { prisma } from '../lib/db/client';
import { createModuleLogger } from '../lib/utils/logger';

const log = createModuleLogger('DeleteBaikeQuestion');

async function main() {
	const date = process.argv[2] || getTodayDate();

	log.info('准备删除题目', { date });

	try {
		// 查找题目
		const question = await prisma.baikeQuestion.findUnique({
			where: { date }
		});

		if (!question) {
			console.log(`❌ 日期 ${date} 的题目不存在`);
			process.exit(0);
		}

		// 删除相关的游戏记录
		const deletedRecords = await prisma.baikeGameRecord.deleteMany({
			where: { questionId: question.id }
		});

		// 删除题目
		await prisma.baikeQuestion.delete({
			where: { id: question.id }
		});

		console.log(`✅ 成功删除题目！`);
		console.log(`   日期: ${date}`);
		console.log(`   标题: ${question.title}`);
		console.log(`   同时删除了 ${deletedRecords.count} 条游戏记录`);

		process.exit(0);
	} catch (error: any) {
		log.error('删除题目失败', error as Error);
		console.error('❌ 删除失败:', error.message);
		process.exit(1);
	}
}

function getTodayDate(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}${month}${day}`;
}

main();

