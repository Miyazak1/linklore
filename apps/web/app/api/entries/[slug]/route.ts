import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { getEntry } from '@/lib/processing/entryOperations';
import { logError } from '@/lib/errors/logger';

/**
 * 获取词条详情（公开）
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ slug: string }> }
) {
	try {
		const { slug } = await params;

		const entry = await getEntry(slug);

		return NextResponse.json(createSuccessResponse(entry));
	} catch (err: any) {
		logError(err, { context: 'GET /api/entries/[slug]', slug });
		const { response, status } = handleError(err, 'GET /api/entries/[slug]');
		return NextResponse.json(response, { status });
	}
}

