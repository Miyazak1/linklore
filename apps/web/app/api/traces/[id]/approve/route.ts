import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { requireEditor } from '@/lib/auth/permissions';
import { approveTrace } from '@/lib/processing/entryOperations';

/**
 * 采纳溯源（创建词条）
 */
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const editor = await requireEditor();
		const { id } = await params;

		const entry = await approveTrace(id, editor.id);

		return NextResponse.json(createSuccessResponse(entry), { status: 201 });
	} catch (err: any) {
		const { response, status } = handleError(err, 'POST /api/traces/[id]/approve');
		return NextResponse.json(response, { status });
	}
}

