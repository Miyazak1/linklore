import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const session = await readSession();
		if (!session?.sub) return NextResponse.json({ error: '未登录' }, { status: 401 });

		// Check if book exists
		const book = await prisma.book.findUnique({ where: { id } });
		if (!book) return NextResponse.json({ error: '书籍不存在' }, { status: 404 });

		// Check if already in shelf
		const existing = await prisma.bookshelfItem.findFirst({
			where: { userId: String(session.sub), bookId: id }
		});
		if (existing) {
			return NextResponse.json({ error: '已在书架中' }, { status: 400 });
		}

		// Add to shelf
		await prisma.bookshelfItem.create({
			data: { userId: String(session.sub), bookId: id }
		});

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '添加失败' }, { status: 400 });
	}
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const session = await readSession();
		if (!session?.sub) return NextResponse.json({ error: '未登录' }, { status: 401 });

		await prisma.bookshelfItem.deleteMany({
			where: { userId: String(session.sub), bookId: id }
		});

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '删除失败' }, { status: 400 });
	}
}










