import { prisma } from '../lib/db/client';

/**
 * 获取今天的题目和内容
 */
async function getTodayQuestion() {
	try {
		// 获取今天的日期（YYYYMMDD格式）
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const today = `${year}${month}${day}`;

		console.log(`\n查询日期: ${today}\n`);

		const question = await prisma.baikeQuestion.findUnique({
			where: { date: today }
		});

		if (!question) {
			console.log('❌ 今天还没有题目');
			console.log('\n提示: 可以访问 /api/games/baike/question 来创建题目');
			return;
		}

		console.log('✅ 找到今天的题目:');
		console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log(`📋 标题: ${question.title}`);
		console.log(`📝 描述: ${question.description || '(无描述)'}`);
		console.log(`🏷️  分类: ${question.category || '(无分类)'}`);
		console.log(`⭐ 难度: ${question.difficulty || '(未设置)'}`);
		console.log(`🆔 ID: ${question.id}`);
		console.log(`📅 日期: ${question.date}`);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

		// 显示标题字符分析（用于测试）
		console.log('📊 标题字符分析:');
		const titleChars = question.title.split('');
		const uniqueChars = new Set(titleChars.map(c => c.toLowerCase()));
		console.log(`   - 总字符数: ${titleChars.length}`);
		console.log(`   - 不重复字符数（大小写不敏感）: ${uniqueChars.size}`);
		console.log(`   - 包含的字符: ${Array.from(uniqueChars).sort().join(', ')}\n`);

		// 检查是否有大小写混合
		const hasUpperCase = /[A-Z]/.test(question.title);
		const hasLowerCase = /[a-z]/.test(question.title);
		if (hasUpperCase && hasLowerCase) {
			console.log('⚠️  注意: 标题包含大小写混合，可以测试大小写不敏感匹配功能\n');
		}

	} catch (error: any) {
		console.error('❌ 查询失败:', error.message);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

getTodayQuestion();











