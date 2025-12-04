import { prisma } from '../lib/db/client';

async function setAdmin() {
	const email = '495469022@qq.com';
	
	try {
		const user = await prisma.user.findUnique({
			where: { email }
		});
		
		if (!user) {
			console.error(`用户 ${email} 不存在`);
			process.exit(1);
		}
		
		if (user.role === 'admin') {
			console.log(`用户 ${email} 已经是管理员`);
			process.exit(0);
		}
		
		await prisma.user.update({
			where: { email },
			data: { role: 'admin' }
		});
		
		console.log(`✅ 已将 ${email} 设置为管理员`);
	} catch (err: any) {
		console.error('设置管理员失败:', err.message);
		process.exit(1);
	}
}

setAdmin()
	.then(() => {
		process.exit(0);
	})
	.catch((err) => {
		console.error('错误:', err);
		process.exit(1);
	});



