import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';

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
 * GET /api/workshop/games
 * 获取游戏列表
 */
export async function GET(req: Request) {
	try {
		const session = await readSession();
		const { searchParams } = new URL(req.url);
		const status = searchParams.get('status');
		const isPublic = searchParams.get('public') === 'true';

		const where: any = {};
		
		// 如果指定了状态筛选
		if (status && status !== 'all') {
			where.status = status;
		}

		// 如果查询公开游戏，只显示已发布的公开游戏
		// 否则显示用户自己的游戏或公开的游戏
		if (isPublic) {
			where.isPublic = true;
			where.status = 'published';
		} else if (session?.sub) {
			// 登录用户：显示自己的游戏 + 已发布的公开游戏
			where.OR = [
				{ authorId: String(session.sub) },
				{ isPublic: true, status: 'published' }
			];
		} else {
			// 匿名用户：只显示已发布的公开游戏
			where.isPublic = true;
			where.status = 'published';
		}

		// 查询用户创建的游戏
		let games: any[] = [];
		try {
			games = await prisma.gameInstance.findMany({
			where,
			include: {
				author: {
					select: {
						email: true,
						name: true,
						avatarUrl: true
					}
				},
				_count: {
					select: {
						plays: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			},
			take: 100
			});
		} catch (err: any) {
			console.error('[Workshop Games API] Error fetching games:', err?.message || err);
			// 如果查询失败，使用空数组继续执行
			games = [];
		}

		// 构建游戏列表
		const gameList = games.map(game => ({
			...game,
			createdAt: game.createdAt.toISOString(),
			updatedAt: game.updatedAt.toISOString(),
			isOfficial: false
		}));

		// 获取今日的每日百科作为官方游戏卡片（始终显示，作为入口）
		const today = getTodayDate();
		let baikeQuestion = null;
		let playCount = 0;

		try {
			// 尝试查询今日题目（如果失败也不影响其他游戏显示）
			baikeQuestion = await prisma.baikeQuestion.findUnique({
				where: { date: today },
				include: {
					_count: {
						select: {
							gameRecords: true
						}
					}
				}
			});
			if (baikeQuestion?._count) {
				playCount = baikeQuestion._count.gameRecords || 0;
			}
		} catch (err: any) {
			// 如果查询失败，记录错误但继续执行（使用默认值）
			console.warn('[Workshop Games API] Could not fetch baike question:', err?.message || err);
		}

		// 构建每日百科官方游戏卡片（始终显示，作为入口，点击后跳转到游戏页面）
		const baikeGame = {
			id: `official-baike-${today}`,
			title: '每日百科',
			description: '猜出隐藏的百科标题，挑战你的知识储备。每次只能输入一个字符，用最少的次数猜出答案！',
			coverUrl: null,
			tags: ['官方', '每日挑战', '百科'],
			status: 'published' as const,
			isPublic: true,
			difficulty: baikeQuestion?.difficulty || null,
			author: {
				email: 'system@mooyu.com',
				name: '官方',
				avatarUrl: null
			},
			createdAt: baikeQuestion?.createdAt ? baikeQuestion.createdAt.toISOString() : new Date().toISOString(),
			updatedAt: baikeQuestion?.createdAt ? baikeQuestion.createdAt.toISOString() : new Date().toISOString(),
			isOfficial: true,
			_count: {
				plays: playCount
			},
			officialGameRoute: '/games/baike' // 官方游戏的跳转路径
		};

		// 根据状态筛选决定是否包含每日百科
		// 每日百科始终在"全部"和"已发布"状态下显示
		if (!status || status === 'all' || status === 'published') {
			// 每日百科始终放在最前面
			gameList.unshift(baikeGame as any);
		}

		return NextResponse.json({
			success: true,
			games: gameList
		});
	} catch (err: any) {
		console.error('[Workshop Games API] Error:', err);
		return NextResponse.json(
			{ success: false, error: err.message || '获取游戏列表失败' },
			{ status: 500 }
		);
	}
}

/**
 * POST /api/workshop/games
 * 创建新游戏
 */
export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json(
				{ success: false, error: '未登录' },
				{ status: 401 }
			);
		}

		const body = await req.json();
		const { title, description, coverUrl, tags, modules, questions, status, isPublic, difficulty } = body;

		if (!title || !title.trim()) {
			return NextResponse.json(
				{ success: false, error: '游戏标题不能为空' },
				{ status: 400 }
			);
		}

		if (!modules || !questions) {
			return NextResponse.json(
				{ success: false, error: '模块配置和题目数据不能为空' },
				{ status: 400 }
			);
		}

		const game = await prisma.gameInstance.create({
			data: {
				title: title.trim(),
				description: description?.trim() || null,
				coverUrl: coverUrl || null,
				tags: Array.isArray(tags) ? tags : [],
				modules: modules,
				questions: questions,
				status: status || 'draft',
				isPublic: isPublic || false,
				difficulty: difficulty || null,
				authorId: String(session.sub)
			},
			include: {
				author: {
					select: {
						email: true,
						name: true,
						avatarUrl: true
					}
				}
			}
		});

		return NextResponse.json({
			success: true,
			game: {
				...game,
				createdAt: game.createdAt.toISOString(),
				updatedAt: game.updatedAt.toISOString()
			}
		});
	} catch (err: any) {
		console.error('[Workshop Games API] Error:', err);
		return NextResponse.json(
			{ success: false, error: err.message || '创建游戏失败' },
			{ status: 500 }
		);
	}
}

