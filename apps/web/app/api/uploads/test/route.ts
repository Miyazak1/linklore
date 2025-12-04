import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
	return NextResponse.json({ ok: true, message: 'Test route works' }, {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
}








