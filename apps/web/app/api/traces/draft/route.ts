import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { requireEditor } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';

/**
 * 保存草稿到服务器
 */
export async function POST(req: Request) {
	try {
		const editor = await requireEditor();
		const body = await req.json();

		// 将草稿保存到用户的草稿存储（可以使用User模型扩展，或创建Draft模型）
		// 这里简化处理，使用Redis或数据库存储
		// 暂时返回成功，实际实现需要创建Draft表或使用Redis

		return NextResponse.json(createSuccessResponse({ saved: true }));
	} catch (err: any) {
		const { response, status } = handleError(err, 'POST /api/traces/draft');
		return NextResponse.json(response, { status });
	}
}

/**
 * 从服务器加载草稿
 */
export async function GET(req: Request) {
	try {
		const editor = await requireEditor();

		// 从服务器加载草稿
		// 暂时返回空，实际实现需要从数据库或Redis加载

		return NextResponse.json(createSuccessResponse(null));
	} catch (err: any) {
		const { response, status } = handleError(err, 'GET /api/traces/draft');
		return NextResponse.json(response, { status });
	}
}

