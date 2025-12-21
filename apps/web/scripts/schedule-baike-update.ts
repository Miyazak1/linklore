/**
 * 定时任务：每天9点更新每日百科题目
 * 
 * 使用方法：
 * - 开发环境：pnpm tsx apps/web/scripts/schedule-baike-update.ts
 * - 生产环境：使用PM2或systemd运行此脚本
 * 
 * 注意：此脚本会持续运行，使用node-cron定时执行任务
 */

import cron from 'node-cron';
import { updateDailyQuestion } from '@/lib/games/baike/updateDailyQuestion';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('ScheduleBaikeUpdate');

// 每天9点执行（北京时间 UTC+8，即UTC 1:00）
// 格式：分钟 小时 日 月 星期
// '0 1 * * *' 表示每天UTC 1:00（北京时间9:00）
const CRON_SCHEDULE = process.env.BAIKE_UPDATE_CRON || '0 1 * * *';

log.info('启动定时任务', { schedule: CRON_SCHEDULE, timezone: 'UTC' });

// 立即执行一次（用于测试或首次运行）
if (process.env.RUN_IMMEDIATELY === 'true') {
	log.info('立即执行一次更新任务');
	updateDailyQuestion().catch(err => {
		log.error('立即执行失败', err as Error);
	});
}

// 设置定时任务
cron.schedule(CRON_SCHEDULE, async () => {
	log.info('定时任务触发，开始更新每日题目');
	
	try {
		const result = await updateDailyQuestion();
		
		if (result.success) {
			log.info('定时任务执行成功', {
				questionId: result.questionId,
				title: result.title
			});
		} else {
			log.error('定时任务执行失败', { error: result.error });
		}
	} catch (error: any) {
		log.error('定时任务执行异常', error as Error);
	}
}, {
	timezone: 'UTC' // 使用UTC时区
});

log.info('定时任务已启动', { 
	schedule: CRON_SCHEDULE,
	description: '每天UTC 1:00（北京时间9:00）执行',
	nextRun: '将在下一个调度时间执行'
});

// 保持进程运行
process.on('SIGINT', () => {
	log.info('收到SIGINT信号，正在关闭定时任务...');
	process.exit(0);
});

process.on('SIGTERM', () => {
	log.info('收到SIGTERM信号，正在关闭定时任务...');
	process.exit(0);
});

