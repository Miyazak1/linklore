/**
 * 检查 ChatRoom 表的实际结构
 */

import { prisma } from '../lib/db/client';

async function main() {
	try {
		// 检查表结构
		const columns = await prisma.$queryRaw<Array<{column_name: string, data_type: string, udt_name: string}>>`
			SELECT column_name, data_type, udt_name
			FROM information_schema.columns 
			WHERE table_name = 'ChatRoom'
			ORDER BY ordinal_position;
		`;

		console.log('\n📋 ChatRoom 表结构:');
		console.log(JSON.stringify(columns, null, 2));

		// 检查枚举类型
		const enums = await prisma.$queryRaw<Array<{enum_name: string, enum_value: string}>>`
			SELECT t.typname as enum_name, e.enumlabel as enum_value
			FROM pg_type t 
			JOIN pg_enum e ON t.oid = e.enumtypid  
			WHERE t.typname LIKE '%Room%' OR t.typname LIKE '%Chat%'
			ORDER BY t.typname, e.enumsortorder;
		`;

		console.log('\n📋 相关枚举类型:');
		console.log(JSON.stringify(enums, null, 2));

		// 检查约束
		const constraints = await prisma.$queryRaw<Array<{constraint_name: string, constraint_type: string}>>`
			SELECT constraint_name, constraint_type
			FROM information_schema.table_constraints
			WHERE table_name = 'ChatRoom';
		`;

		console.log('\n📋 表约束:');
		console.log(JSON.stringify(constraints, null, 2));

		process.exit(0);
	} catch (error: any) {
		console.error('❌ 检查失败:', error.message);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();

