import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { routeAiCall } from '@/lib/ai/router';
import { z } from 'zod';

const AssistTopicSchema = z.object({
	topic: z.string().min(1),
	currentDescription: z.string().optional()
});

/**
 * POST /api/chat/ai/assist-topic
 * 使用AI辅助完善主题描述
 */
export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const body = await req.json();
		const { topic, currentDescription } = AssistTopicSchema.parse(body);

		// 构建AI提示词
		const prompt = `用户想要讨论的主题是：${topic}

${currentDescription ? `用户当前的描述是：${currentDescription}\n\n` : ''}请帮助用户完善这个主题的描述，使其更加清晰、准确、具体。描述应该包括：
1. 主题的背景和重要性
2. 讨论的范围和边界
3. 讨论的目标和期望达成的结果
4. 可能涉及的关键问题或角度

请用简洁、清晰的语言，帮助用户更准确地表达他们的想法。直接输出完善后的描述，不需要额外的说明。`;

		// 调用AI
		const aiResponse = await routeAiCall({
			userId: session.sub,
			task: 'summarize',
			estimatedMaxCostCents: 5,
			prompt
		});

		return NextResponse.json({
			suggestion: aiResponse.text
		});
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: '请求参数错误', details: error.errors },
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ error: error.message || 'AI辅助失败' },
			{ status: 500 }
		);
	}
}















