import { prisma } from '../lib/db/client';

const email = 'misakitoufu@gmail.com';

async function deleteUser() {
	try {
		const user = await prisma.user.findUnique({
			where: { email },
			select: { id: true, email: true, createdAt: true }
		});

		if (!user) {
			console.log('未找到该邮箱的用户');
			return;
		}

		console.log('找到用户：', user);
		console.log('正在删除...');

		// 删除用户（由于外键约束，可能需要先删除相关数据）
		// 先删除用户创建的话题和文档
		await prisma.document.deleteMany({
			where: { authorId: user.id }
		});

		await prisma.topic.deleteMany({
			where: { authorId: user.id }
		});

		// 删除用户
		await prisma.user.delete({
			where: { email }
		});

		console.log('✅ 用户已删除');
	} catch (error: any) {
		console.error('❌ 错误：', error.message);
	} finally {
		await prisma.$disconnect();
	}
}

deleteUser();








