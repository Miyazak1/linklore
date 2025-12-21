/**
 * 重置游戏状态脚本
 * 删除指定日期的游戏记录和题目（可选）
 * 
 * 使用方法：
 * pnpm tsx scripts/reset-baike-game.ts [date]
 * 
 * 示例：
 * pnpm tsx scripts/reset-baike-game.ts 20251219
 * pnpm tsx scripts/reset-baike-game.ts  # 重置今天的游戏
 */

import { prisma } from '../lib/db/client';
import { createModuleLogger } from '../lib/utils/logger';

const log = createModuleLogger('ResetBaikeGame');

async function main() {
	const date = process.argv[2] || getTodayDate();
	const deleteQuestion = process.argv[3] === '--delete-question';

	log.info('准备重置游戏状态', { date, deleteQuestion });

	try {
		// 删除所有游戏记录
		const deletedRecords = await prisma.baikeGameRecord.deleteMany({
			where: { date }
		});

		console.log(`✅ 成功删除 ${deletedRecords.count} 条游戏记录`);

		// 如果指定了删除题目，也删除题目
		if (deleteQuestion) {
			const question = await prisma.baikeQuestion.findUnique({
				where: { date }
			});

			if (question) {
				await prisma.baikeQuestion.delete({
					where: { id: question.id }
				});
				console.log(`✅ 成功删除题目: ${question.title}`);
			} else {
				console.log(`ℹ️  日期 ${date} 的题目不存在`);
			}
		}

		console.log(`\n📝 提示：`);
		console.log(`   1. 数据库记录已清除`);
		console.log(`   2. 请清除浏览器本地存储：`);
		console.log(`      - 打开浏览器开发者工具（F12）`);
		console.log(`      - 进入 Application/存储 → Local Storage`);
		console.log(`      - 删除 key 为 "baike_game_state" 的项`);
		console.log(`   或者在控制台执行：localStorage.removeItem('baike_game_state')`);

		process.exit(0);
	} catch (error: any) {
		log.error('重置游戏状态失败', error as Error);
		console.error('❌ 重置失败:', error.message);
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

