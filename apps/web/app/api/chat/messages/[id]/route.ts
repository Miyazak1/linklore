import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

/**
 * DELETE /api/chat/messages/:id
 * 删除消息（软删除）
 */
export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const { id } = await params;

		// 获取消息
		const message = await prisma.chatMessage.findUnique({
			where: { id },
			select: {
				senderId: true,
				roomId: true
			}
		});

		if (!message) {
			return NextResponse.json({ error: '消息不存在' }, { status: 404 });
		}

		// 只能删除自己发送的消息
		if (message.senderId !== session.sub) {
			return NextResponse.json(
				{ error: '只能删除自己发送的消息' },
				{ status: 403 }
			);
		}

		// 软删除
		await prisma.chatMessage.update({
			where: { id },
			data: { deletedAt: new Date() }
		});

		return NextResponse.json({ ok: true });
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.message || '删除消息失败' },
			{ status: 500 }
		);
	}
}

