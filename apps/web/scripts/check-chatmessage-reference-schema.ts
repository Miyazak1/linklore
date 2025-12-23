/**
 * 检查 ChatMessageReference 表的实际结构
 */

import { prisma } from '../lib/db/client';

async function main() {
	try {
		// 检查表是否存在
		const tableExists = await prisma.$queryRaw<Array<{exists: boolean}>>`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = 'ChatMessageReference'
			);
		`;

		console.log('\n📋 ChatMessageReference 表存在:', tableExists[0]?.exists);

		if (tableExists[0]?.exists) {
			// 检查表结构
			const columns = await prisma.$queryRaw<Array<{column_name: string, data_type: string, udt_name: string}>>`
				SELECT column_name, data_type, udt_name
				FROM information_schema.columns 
				WHERE table_name = 'ChatMessageReference'
				ORDER BY ordinal_position;
			`;

			console.log('\n📋 ChatMessageReference 表结构:');
			console.log(JSON.stringify(columns, null, 2));
		} else {
			console.log('\n⚠️ ChatMessageReference 表不存在，需要创建');
		}

		process.exit(0);
	} catch (error: any) {
		console.error('❌ 检查失败:', error.message);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();





