import { prisma } from '../lib/db/client';

const email = 'misakitoufu@gmail.com';

async function checkUser() {
	try {
		const user = await prisma.user.findUnique({
			where: { email },
			select: { id: true, email: true, createdAt: true, role: true }
		});

		if (user) {
			console.log('找到用户：', user);
			console.log('是否删除？(y/n)');
			// 如果需要删除，取消下面的注释
			// await prisma.user.delete({ where: { email } });
			// console.log('用户已删除');
		} else {
			console.log('未找到该邮箱的用户');
		}
	} catch (error: any) {
		console.error('错误：', error.message);
	} finally {
		await prisma.$disconnect();
	}
}

checkUser();








