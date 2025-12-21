/**
 * 检查当前会话状态的脚本
 * 用于调试和验证登录状态
 */

import { readSession } from '../lib/auth/session';
import { prisma } from '../lib/db/client';

async function checkSession() {
	console.log('=== 检查当前会话状态 ===\n');

	try {
		// 1. 读取会话
		const session = await readSession();
		
		if (!session) {
			console.log('❌ 没有活动会话');
			console.log('   说明：用户未登录或会话已过期\n');
			return;
		}

		console.log('✅ 检测到活动会话');
		console.log('   会话信息:');
		console.log(`   - User ID (sub): ${session.sub}`);
		console.log(`   - Email: ${session.email || 'N/A'}`);
		console.log(`   - Role: ${session.role || 'N/A'}`);
		console.log(`   - Issued At: ${session.iat ? new Date((session.iat as number) * 1000).toISOString() : 'N/A'}`);
		console.log(`   - Expires At: ${session.exp ? new Date((session.exp as number) * 1000).toISOString() : 'N/A'}`);
		
		// 检查是否过期
		if (session.exp) {
			const expiresAt = new Date((session.exp as number) * 1000);
			const now = new Date();
			if (expiresAt < now) {
				console.log('   ⚠️  会话已过期');
			} else {
				const remainingMs = expiresAt.getTime() - now.getTime();
				const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
				console.log(`   ⏰ 会话剩余时间: ${remainingHours} 小时`);
			}
		}

		// 2. 从数据库验证用户是否存在
		if (session.sub) {
			console.log('\n=== 验证数据库中的用户 ===');
			const user = await prisma.user.findUnique({
				where: { id: String(session.sub) },
				select: {
					id: true,
					email: true,
					name: true,
					role: true,
					createdAt: true,
					updatedAt: true
				}
			});

			if (!user) {
				console.log('❌ 数据库中没有找到对应用户');
				console.log(`   会话中的 User ID: ${session.sub}`);
				console.log('   建议：清理无效会话');
			} else {
				console.log('✅ 用户存在于数据库');
				console.log(`   - ID: ${user.id}`);
				console.log(`   - Email: ${user.email}`);
				console.log(`   - Name: ${user.name || 'N/A'}`);
				console.log(`   - Role: ${user.role}`);
				console.log(`   - Created: ${user.createdAt.toISOString()}`);
				console.log(`   - Updated: ${user.updatedAt.toISOString()}`);
			}
		}

		console.log('\n=== 会话状态总结 ===');
		console.log('✅ 会话有效');
		
	} catch (error: any) {
		console.error('❌ 检查会话时出错:', error.message);
		console.error(error);
	} finally {
		await prisma.$disconnect();
	}
}

// 如果直接运行此脚本
if (require.main === module) {
	checkSession().catch(console.error);
}

export { checkSession };









