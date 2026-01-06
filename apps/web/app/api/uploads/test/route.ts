/**
 * 测试路由 - 仅用于开发环境
 * 生产环境应禁用此路由
 */
import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
	// 生产环境禁用
	if (process.env.NODE_ENV === 'production') {
		return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
	}

	// 开发环境也需要登录检查
	const session = await readSession();
	if (!session?.sub) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	return NextResponse.json({ ok: true, message: 'Test route works' }, {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
}








