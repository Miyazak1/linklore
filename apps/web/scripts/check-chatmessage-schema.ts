/**
 * 检查 ChatMessage 表的实际结构
 */

import { prisma } from '../lib/db/client';

async function main() {
	try {
		// 检查表结构
		const columns = await prisma.$queryRaw<Array<{column_name: string, data_type: string, udt_name: string}>>`
			SELECT column_name, data_type, udt_name
			FROM information_schema.columns 
			WHERE table_name = 'ChatMessage'
			ORDER BY ordinal_position;
		`;

		console.log('\n📋 ChatMessage 表结构:');
		console.log(JSON.stringify(columns, null, 2));

		// 检查枚举类型
		const enums = await prisma.$queryRaw<Array<{enum_name: string, enum_value: string}>>`
			SELECT t.typname as enum_name, e.enumlabel as enum_value
			FROM pg_type t 
			JOIN pg_enum e ON t.oid = e.enumtypid  
			WHERE t.typname LIKE '%Message%' OR t.typname LIKE '%Content%' OR t.typname LIKE '%Moderation%'
			ORDER BY t.typname, e.enumsortorder;
		`;

		console.log('\n📋 相关枚举类型:');
		console.log(JSON.stringify(enums, null, 2));

		process.exit(0);
	} catch (error: any) {
		console.error('❌ 检查失败:', error.message);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();





