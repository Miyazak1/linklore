import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { chatDb } from '@/lib/modules/chat/db';
import { z } from 'zod';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('Chat Rooms API');

const CreateRoomSchema = z.object({
	type: z.enum(['SOLO', 'DUO']).optional().default('SOLO'),
	topic: z.string().optional(), // 支持创建时设置话题
	topicDescription: z.string().optional() // 支持创建时设置话题描述
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
		const { type, topic, topicDescription } = CreateRoomSchema.parse(body);

		// 创建聊天室（同时设置话题，如果提供）
		const room = await chatDb.rooms.create({
			data: {
				type: type,
				creatorId: session.sub,
				status: 'ACTIVE',
				topic: topic || null,
				topicDescription: topicDescription || null
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
		log.error('创建聊天室失败', error as Error);
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
				chatDb.rooms.findMany({
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
				chatDb.rooms.count({ where })
			]);
		} catch (dbError: any) {
			// 记录详细错误信息
			log.error('查询聊天室列表失败', dbError as Error, {
				code: dbError.code,
				message: dbError.message,
				meta: dbError.meta
			});
			
			// 如果表不存在，返回友好的错误信息
			if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
				throw new Error(
					'数据库表尚未创建。请运行: pnpm prisma migrate dev --name add_chat_models'
				);
			}
			// 如果是字段不存在的错误
			if (dbError.code === 'P2009' || dbError.message?.includes('Unknown argument') || dbError.message?.includes('Unknown field')) {
				log.error('数据库字段不匹配，可能需要重新生成 Prisma Client', dbError as Error);
				throw new Error(
					'数据库字段不匹配。请重启开发服务器或运行: pnpm prisma generate'
				);
			}
			throw dbError;
		}

		// 获取每个房间的最后一条消息
		const roomsWithLastMessage = await Promise.all(
			rooms.map(async (room) => {
				const lastMessage = await chatDb.messages.findFirst({
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
		log.error('获取聊天室列表失败', error as Error);
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: '请求参数错误', details: error.errors },
				{ status: 400 }
			);
		}
		// 返回更详细的错误信息
		const errorMessage = error.message || '获取聊天室列表失败';
		log.error('获取聊天室列表失败 - 详细信息', error as Error, {
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

