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
	let slug: string | undefined;
	try {
		const paramsResolved = await params;
		slug = paramsResolved.slug;

		const entry = await getEntry(slug);

		return NextResponse.json(createSuccessResponse(entry));
	} catch (err: any) {
		logError(err, { context: 'GET /api/entries/[slug]', slug: slug || 'unknown' });
		const { response, status } = handleError(err, 'GET /api/entries/[slug]');
		return NextResponse.json(response, { status });
	}
}

