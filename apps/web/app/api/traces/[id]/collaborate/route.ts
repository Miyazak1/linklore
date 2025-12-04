import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { requireEditor, checkOwnership } from '@/lib/auth/permissions';
import {
	addActiveEditor,
	removeActiveEditor,
	createCollaborationEvent,
	detectConflict
} from '@/lib/realtime/collaboration';

/**
 * SSE 连接端点
 * 用于实时协作编辑
 */
export async function GET(
	req: Request,
	{ params }: { params: { id: string } }
) {
	const traceId = params.id;

	try {
		const user = await requireEditor();
		await checkOwnership(traceId, user.id);

		// 创建 SSE 响应
		const stream = new ReadableStream({
			async start(controller) {
				// 添加用户到活跃编辑者列表
				addActiveEditor(traceId, user.id);

				// 发送连接成功事件
				const encoder = new TextEncoder();
				const sendEvent = (event: string, data: any) => {
					const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
					controller.enqueue(encoder.encode(message));
				};

				sendEvent('connected', {
					message: 'Connected to collaboration stream',
					traceId,
					userId: user.id
				});

				// 定期发送心跳
				const heartbeatInterval = setInterval(() => {
					try {
						sendEvent('heartbeat', { timestamp: Date.now() });
					} catch (err) {
						clearInterval(heartbeatInterval);
					}
				}, 30000); // 每30秒

				// 监听连接关闭
				req.signal.addEventListener('abort', () => {
					clearInterval(heartbeatInterval);
					removeActiveEditor(traceId, user.id);
					controller.close();
				});
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
				'X-Accel-Buffering': 'no' // 禁用 nginx 缓冲
			}
		});
	} catch (err: any) {
		return NextResponse.json(
			{ success: false, error: { message: err.message } },
			{ status: 403 }
		);
	}
}

/**
 * 发送协作事件
 */
export async function POST(
	req: Request,
	{ params }: { params: { id: string } }
) {
	const traceId = params.id;

	try {
		const user = await requireEditor();
		await checkOwnership(traceId, user.id);

		const body = await req.json();
		const { type, data, version } = body;

		// 检测冲突
		const hasConflict = await detectConflict(traceId, user.id, version || 0);
		if (hasConflict) {
			return NextResponse.json({
				success: false,
				error: {
					code: 'CONFLICT',
					message: '检测到编辑冲突，请刷新页面后重试'
				}
			}, { status: 409 });
		}

		// 创建协作事件
		const event = createCollaborationEvent(
			type,
			traceId,
			user.id,
			user.email,
			data
		);

		// TODO: 广播事件给其他连接的客户端
		// 这里可以使用 Redis Pub/Sub 或 WebSocket 服务器

		return NextResponse.json({
			success: true,
			data: { event }
		});
	} catch (err: any) {
		return NextResponse.json(
			{ success: false, error: { message: err.message } },
			{ status: 500 }
		);
	}
}

