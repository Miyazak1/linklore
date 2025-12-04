import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { requireEditor, checkOwnership } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';

/**
 * 保存特定溯源的草稿到服务器
 */
export async function POST(
	req: Request,
	{ params }: { params: { id: string } }
) {
	try {
		const editor = await requireEditor();
		const traceId = params.id;

		// 检查权限
		await checkOwnership(traceId, editor.id);

		const body = await req.json();

		// 将草稿保存到服务器
		// 暂时返回成功，实际实现需要创建Draft表或使用Redis

		return NextResponse.json(createSuccessResponse({ saved: true }));
	} catch (err: any) {
		const { response, status } = handleError(err, `POST /api/traces/${params.id}/draft`);
		return NextResponse.json(response, { status });
	}
}

/**
 * 从服务器加载特定溯源的草稿
 */
export async function GET(
	req: Request,
	{ params }: { params: { id: string } }
) {
	try {
		const editor = await requireEditor();
		const traceId = params.id;

		// 检查权限
		await checkOwnership(traceId, editor.id);

		// 从服务器加载草稿
		// 暂时返回空，实际实现需要从数据库或Redis加载

		return NextResponse.json(createSuccessResponse(null));
	} catch (err: any) {
		const { response, status } = handleError(err, `GET /api/traces/${params.id}/draft`);
		return NextResponse.json(response, { status });
	}
}

