import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';

const CreateRoomSchema = z.object({
	type: z.enum(['SOLO', 'DUO']).optional().default('SOLO')
});

const GetRoomsQuerySchema = z.object({
	page: z.string().optional().default('1'),
	limit: z.string().optional().default('20'),
	status: z.enum(['ACTIVE', 'ARCHIVED', 'DISSOLVED']).optional()
});

/**
 * POST /api/chat/rooms
 * 创建聊天室
 */
export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const body = await req.json();
		const { type } = CreateRoomSchema.parse(body);

		// 检查是否是匿名用户
		const isGuest = (session as any).isGuest === true;
		
		// 匿名用户只能创建 SOLO 房间
		if (isGuest && type === 'DUO') {
			return NextResponse.json(
				{ error: '匿名用户只能创建单人聊天室' },
				{ status: 403 }
			);
		}

		// 创建聊天室
		const room = await prisma.chatRoom.create({
			data: {
				type: isGuest ? 'SOLO' : type, // 强制匿名用户使用 SOLO
				creatorId: session.sub,
				status: 'ACTIVE'
			},
			include: {
				creator: {
					select: {
						id: true,
						email: true,
						name: true,
						avatarUrl: true
					}
				}
			}
		});

		return NextResponse.json({ room });
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: '请求参数错误', details: error.errors },
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ error: error.message || '创建聊天室失败' },
			{ status: 500 }
		);
	}
}

/**
 * GET /api/chat/rooms
 * 获取用户的聊天室列表
 */
export async function GET(req: Request) {
	try {
		const session = await readSession();
		// 允许匿名用户访问（session 可能为空，但会在前端创建匿名用户）
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		
		// 安全解析查询参数
		const pageParam = searchParams.get('page');
		const limitParam = searchParams.get('limit');
		const statusParam = searchParams.get('status');
		
		// 验证 status 参数
		let validStatus: 'ACTIVE' | 'ARCHIVED' | 'DISSOLVED' | undefined = undefined;
		if (statusParam && ['ACTIVE', 'ARCHIVED', 'DISSOLVED'].includes(statusParam)) {
			validStatus = statusParam as 'ACTIVE' | 'ARCHIVED' | 'DISSOLVED';
		}
		
		// 构建解析对象（只包含有效的参数）
		const parseInput: any = {
			page: pageParam || '1',
			limit: limitParam || '20'
		};
		if (validStatus) {
			parseInput.status = validStatus;
		}
		
		const { page, limit } = GetRoomsQuerySchema.parse(parseInput);
		const status = validStatus;

		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);
		const skip = (pageNum - 1) * limitNum;

		// 构建查询条件
		// 用户可以看到的房间：是创建者或参与者，且未删除（从自己的视角）
		const where: any = {
			OR: [
				{
					creatorId: session.sub,
					creatorDeletedAt: null // 创建者未删除
				},
				{
					participantId: session.sub,
					participantDeletedAt: null // 参与者未删除
				}
			]
		};

		if (status) {
			where.status = status;
		}

		// 查询房间列表
		// 注意：如果表不存在，这里会抛出错误
		let rooms, total;
		try {
			[rooms, total] = await Promise.all([
				prisma.chatRoom.findMany({
				where,
				select: {
					id: true,
					type: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					topic: true, // 添加topic字段
					topicDescription: true, // 添加topicDescription字段
					creator: {
						select: {
							id: true,
							email: true,
							name: true,
							avatarUrl: true
						}
					},
					participant: {
						select: {
							id: true,
							email: true,
							name: true,
							avatarUrl: true
						}
					},
					messages: {
						select: {
							id: true,
							createdAt: true
						},
						orderBy: { createdAt: 'desc' },
						take: 1
					}
				},
					orderBy: { updatedAt: 'desc' },
					skip,
					take: limitNum
				}),
				prisma.chatRoom.count({ where })
			]);
		} catch (dbError: any) {
			// 如果表不存在，返回友好的错误信息
			if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
				throw new Error(
					'数据库表尚未创建。请运行: pnpm prisma migrate dev --name add_chat_models'
				);
			}
			throw dbError;
		}

		// 获取每个房间的最后一条消息
		const roomsWithLastMessage = await Promise.all(
			rooms.map(async (room) => {
				const lastMessage = await prisma.chatMessage.findFirst({
					where: { roomId: room.id, deletedAt: null },
					orderBy: { sequence: 'desc' },
					select: {
						id: true,
						content: true,
						contentType: true,
						createdAt: true,
						sender: {
							select: {
								id: true,
								name: true,
								email: true
							}
						}
					}
				});

				return {
					...room,
					topic: room.topic, // 确保topic字段被包含
					topicDescription: room.topicDescription, // 确保topicDescription字段被包含
					lastMessage: lastMessage
						? {
								...lastMessage,
								content:
									lastMessage.content.length > 100
										? lastMessage.content.slice(0, 100) + '...'
										: lastMessage.content
							}
						: null
				};
			})
		);

		return NextResponse.json({
			rooms: roomsWithLastMessage,
			total,
			page: pageNum,
			limit: limitNum
		});
	} catch (error: any) {
		console.error('[Chat Rooms API] Error:', error);
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: '请求参数错误', details: error.errors },
				{ status: 400 }
			);
		}
		// 返回更详细的错误信息
		const errorMessage = error.message || '获取聊天室列表失败';
		console.error('[Chat Rooms API] Error details:', {
			message: errorMessage,
			stack: error.stack,
			name: error.name
		});
		return NextResponse.json(
			{ error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.stack : undefined },
			{ status: 500 }
		);
	}
}

