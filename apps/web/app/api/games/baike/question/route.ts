import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('BaikeQuestionAPI');

/**
 * 获取当日百科题目
 * GET /api/games/baike/question?date=20251219
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const date = searchParams.get('date');

		// 如果没有提供日期，使用今天的日期
		const targetDate = date || getTodayDate();

		// 验证日期格式（YYYYMMDD）
		if (!/^\d{8}$/.test(targetDate)) {
			return NextResponse.json(
				{ error: 'Invalid date format. Expected YYYYMMDD' },
				{ status: 400 }
			);
		}

		// 查找当日题目
		let question = await prisma.baikeQuestion.findUnique({
			where: { date: targetDate }
		});

		// 如果题目不存在，尝试从维基百科获取
		if (!question) {
			log.info('当日题目不存在，尝试从维基百科获取', { date: targetDate });
			
			// 动态导入更新函数（避免循环依赖）
			const { updateDailyQuestion } = await import('@/lib/games/baike/updateDailyQuestion');
			const updateResult = await updateDailyQuestion(targetDate);

			if (updateResult.success && updateResult.questionId) {
				// 重新查询题目
				question = await prisma.baikeQuestion.findUnique({
					where: { id: updateResult.questionId }
				});
			}

			// 如果仍然没有题目，使用示例题目作为后备
			if (!question) {
				log.warn('无法从维基百科获取题目，使用示例题目', { date: targetDate });
				const exampleTitles = [
					'《红楼梦》是中国古典四大名著之一',
					'量子力学是描述微观粒子运动规律的理论',
					'人工智能是计算机科学的一个分支',
					'太阳系有八大行星围绕太阳运行',
					'DNA是脱氧核糖核酸的缩写'
				];

				const randomTitle = exampleTitles[Math.floor(Math.random() * exampleTitles.length)];

				question = await prisma.baikeQuestion.create({
					data: {
						date: targetDate,
						title: randomTitle,
						description: '猜出隐藏的百科标题',
						category: '综合',
						difficulty: 3
					}
				});

				log.debug('创建示例题目', { date: targetDate, questionId: question.id });
			}
		}

		// 返回题目信息
		// 注意：为了游戏能正常工作，这里返回完整标题
		// 在生产环境中，可以考虑只返回标题长度和标点位置，让前端通过猜测逐步揭示
		// 但为了简化实现，目前返回完整标题，前端负责隐藏显示
		const title = question.title;
		const punctuationPositions: number[] = [];
		
		// 找出所有标点符号的位置
		for (let i = 0; i < title.length; i++) {
			if (isPunctuation(title[i])) {
				punctuationPositions.push(i);
			}
		}

		return NextResponse.json({
			success: true,
			data: {
				questionId: question.id,
				date: question.date,
				title, // 返回完整标题，前端负责隐藏显示
				titleLength: title.length,
				punctuationPositions,
				description: question.description || null, // 返回描述内容
				category: question.category || null
			}
		});
	} catch (error: any) {
		log.error('获取题目失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '获取题目失败' },
			{ status: 500 }
		);
	}
}

/**
 * 获取今天的日期（YYYYMMDD格式）
 */
function getTodayDate(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}${month}${day}`;
}

/**
 * 判断字符是否为标点符号
 */
function isPunctuation(char: string): boolean {
	const chinesePunctuation = /[《》【】「」『』，。、；：！？…—～（）【】]/;
	const englishPunctuation = /[,.!?;:()\[\]{}'"-]/;
	return chinesePunctuation.test(char) || englishPunctuation.test(char);
}

