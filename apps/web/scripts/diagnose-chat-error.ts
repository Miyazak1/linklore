/**
 * 诊断聊天室加载错误
 * 检查数据库表和 Prisma Client 是否匹配
 */

import { prisma } from '../lib/db/client';
import { createModuleLogger } from '../lib/utils/logger';

const log = createModuleLogger('DiagnoseChatError');

async function main() {
	try {
		log.info('开始诊断聊天室错误...');

		// 1. 检查表是否存在
		log.info('检查 ChatRoom 表...');
		const tableCheck = await prisma.$queryRaw`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = 'ChatRoom'
			);
		`;
		log.info('ChatRoom 表存在:', { tableCheck });

		// 2. 检查字段是否存在
		log.info('检查 ChatRoom 表字段...');
		const columns = await prisma.$queryRaw`
			SELECT column_name, data_type 
			FROM information_schema.columns 
			WHERE table_name = 'ChatRoom'
			ORDER BY ordinal_position;
		`;
		log.info('ChatRoom 表字段:', { columns });

		// 3. 尝试简单查询
		log.info('尝试查询 ChatRoom...');
		const count = await prisma.chatRoom.count();
		log.info('ChatRoom 记录数:', { count });

		// 4. 尝试查询一条记录（如果有）
		if (count > 0) {
			const firstRoom = await prisma.chatRoom.findFirst({
				select: {
					id: true,
					type: true,
					status: true,
					creatorId: true,
					participantId: true,
					creatorDeletedAt: true,
					participantDeletedAt: true
				}
			});
			log.info('第一条记录:', { firstRoom });
		}

		log.info('诊断完成，未发现明显问题');
		process.exit(0);
	} catch (error: any) {
		log.error('诊断过程中发现错误', error as Error, {
			code: error.code,
			message: error.message,
			meta: error.meta,
			stack: error.stack
		});
		console.error('\n❌ 错误详情:');
		console.error('错误代码:', error.code);
		console.error('错误消息:', error.message);
		if (error.meta) {
			console.error('元数据:', JSON.stringify(error.meta, null, 2));
		}
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();

