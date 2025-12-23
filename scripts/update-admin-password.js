/**
 * 更新管理员账号密码脚本（Node.js 版本，无需 tsx）
 * 使用方法：node scripts/update-admin-password.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateAdminPassword() {
	const email = '495469022@qq.com';
	const newPassword = 'Nuan2230543@';

	try {
		// 检查用户是否存在
		const existingUser = await prisma.user.findUnique({
			where: { email }
		});

		if (!existingUser) {
			console.error('✗ 用户不存在，请先创建管理员账号');
			console.log('提示：运行 pnpm tsx scripts/create-admin.ts 创建管理员账号');
			process.exit(1);
		}

		// 更新密码
		console.log('正在更新管理员密码...');
		const hashedPassword = await bcrypt.hash(newPassword, 10);
		await prisma.user.update({
			where: { email },
			data: {
				passwordHash: hashedPassword
			}
		});

		console.log('✓ 密码已更新');
		console.log('\n管理员账号信息：');
		console.log('  邮箱：', email);
		console.log('  新密码：', newPassword);
		console.log('  角色：', existingUser.role);
		console.log('\n✓ 完成！');
	} catch (error) {
		console.error('✗ 更新密码失败：', error.message);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

updateAdminPassword();




