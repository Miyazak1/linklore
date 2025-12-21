/**
 * 更新每日百科题目的脚本
 * 可以手动运行，也可以由定时任务调用
 * 
 * 使用方法：
 * - 手动运行：pnpm tsx apps/web/scripts/update-daily-baike.ts
 * - 定时任务：每天9点运行此脚本
 */

import { updateDailyQuestion } from '@/lib/games/baike/updateDailyQuestion';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('UpdateDailyBaikeScript');

async function main() {
	const date = process.argv[2]; // 可选的日期参数（YYYYMMDD格式）

	log.info('开始更新每日百科题目', { date: date || 'today' });

	try {
		const result = await updateDailyQuestion(date);

		if (result.success) {
			log.info('题目更新成功', {
				date: date || 'today',
				questionId: result.questionId,
				title: result.title
			});
			console.log('✅ 题目更新成功！');
			console.log(`   题目ID: ${result.questionId}`);
			console.log(`   标题: ${result.title}`);
			process.exit(0);
		} else {
			log.error('题目更新失败', { error: result.error });
			console.error('❌ 题目更新失败:', result.error);
			process.exit(1);
		}
	} catch (error: any) {
		log.error('脚本执行失败', error as Error);
		console.error('❌ 脚本执行失败:', error.message);
		process.exit(1);
	}
}

main();

