/**
 * 创建默认管理员账号脚本
 * 使用方法：pnpm tsx scripts/create-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
	const email = '495469022@qq.com';
	const password = 'Abc123@';
	const name = '管理员';
	const role = 'admin';

	try {
		// 检查用户是否已存在
		const existingUser = await prisma.user.findUnique({
			where: { email }
		});

		if (existingUser) {
			// 如果存在，更新为管理员
			console.log('用户已存在，更新为管理员...');
			const hashedPassword = await bcrypt.hash(password, 10);
			await prisma.user.update({
				where: { email },
				data: {
					passwordHash: hashedPassword,
					role: role,
					name: name
				}
			});
			console.log('✓ 用户已更新为管理员');
		} else {
			// 如果不存在，创建新用户
			console.log('创建管理员账号...');
			const hashedPassword = await bcrypt.hash(password, 10);
			await prisma.user.create({
				data: {
					email,
					passwordHash: hashedPassword,
					name: name,
					role: role
				}
			});
			console.log('✓ 管理员账号创建成功');
		}

		// 验证
		const user = await prisma.user.findUnique({
			where: { email },
			select: {
				email: true,
				name: true,
				role: true
			}
		});

		console.log('\n管理员账号信息：');
		console.log('  邮箱：', user?.email);
		console.log('  姓名：', user?.name);
		console.log('  角色：', user?.role);
		console.log('  密码：', password);
		console.log('\n✓ 完成！');
	} catch (error: any) {
		console.error('✗ 创建管理员失败：', error.message);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

createAdmin();

