import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';

const NicknameSchema = z.object({
	nickname: z.string().max(50).optional() // 可选，最多50字符
});

/**
 * 生成默认AI昵称（基于用户信息，确保每个用户不同）
 */
function generateDefaultNickname(userId: string, userName: string | null, userEmail: string): string {
	// 如果有用户名，使用"AI助手-用户名"
	if (userName && userName.trim()) {
		return `AI助手-${userName.trim()}`;
	}
	
	// 否则使用邮箱前缀
	const emailPrefix = userEmail.split('@')[0];
	return `AI助手-${emailPrefix}`;
}

/**
 * GET /api/ai/nickname
 * 获取当前用户的AI昵称
 */
export async function GET() {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		// 获取用户信息
		let user;
		try {
			user = await prisma.user.findUnique({
				where: { id: session.sub },
				select: {
					name: true,
					email: true
				}
			});
		} catch (userError: any) {
			console.error('[AI Nickname API] 查询用户失败:', userError);
			// 如果查询失败，返回默认值
			return NextResponse.json({
				nickname: 'AI助手',
				isSystemAi: true,
				provider: null,
				model: null
			});
		}

		if (!user) {
			// 用户不存在，返回默认值
			return NextResponse.json({
				nickname: 'AI助手',
				isSystemAi: true,
				provider: null,
				model: null
			});
		}

		let userConfig;
		try {
			userConfig = await prisma.userAiConfig.findUnique({
				where: { userId: session.sub },
				select: {
					aiNickname: true,
					provider: true,
					model: true
				}
			});
		} catch (configError: any) {
			console.error('[AI Nickname API] 查询用户配置失败:', configError);
			// 如果查询失败，使用默认值
			userConfig = null;
		}

		// 如果没有用户配置，使用系统配置
		let isSystemAi = false;
		if (!userConfig) {
			try {
				const systemConfig = await prisma.systemAiConfig.findFirst({
					orderBy: { updatedAt: 'desc' }
				});
				isSystemAi = !!systemConfig;
			} catch (systemError: any) {
				console.error('[AI Nickname API] 查询系统配置失败:', systemError);
				// 如果查询失败，默认使用系统AI
				isSystemAi = true;
			}
		}

		// 如果没有设置昵称，生成默认昵称
		let nickname = userConfig?.aiNickname;
		if (!nickname) {
			nickname = generateDefaultNickname(session.sub, user.name, user.email);
		}

		return NextResponse.json({
			nickname,
			isSystemAi,
			provider: userConfig?.provider || null,
			model: userConfig?.model || null
		});
	} catch (error: any) {
		console.error('[AI Nickname API] 未知错误:', error);
		// 返回默认值，而不是错误
		return NextResponse.json({
			nickname: 'AI助手',
			isSystemAi: true,
			provider: null,
			model: null
		});
	}
}

/**
 * POST /api/ai/nickname
 * 设置当前用户的AI昵称
 */
export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const body = await req.json();
		const { nickname } = NicknameSchema.parse(body);

		// 更新或创建用户AI配置
		await prisma.userAiConfig.upsert({
			where: { userId: session.sub },
			update: {
				aiNickname: nickname || null
			},
			create: {
				userId: session.sub,
				provider: 'siliconflow', // 默认值
				model: 'deepseek-chat',
				encApiKey: '', // 需要后续配置
				aiNickname: nickname || null
			}
		});

		return NextResponse.json({ ok: true });
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: '请求参数错误', details: error.errors },
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ error: error.message || '设置AI昵称失败' },
			{ status: 500 }
		);
	}
}

