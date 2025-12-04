import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		
		const snapshots = await prisma.consensusSnapshot.findMany({
			where: { topicId: id },
			orderBy: { snapshotAt: 'desc' },
			take: 20,
			select: {
				id: true,
				snapshotAt: true,
				consensusScore: true,
				divergenceScore: true,
				consensusData: true
			}
		});

		// Convert to client-friendly format
		const formatted = snapshots.map(s => ({
			id: s.id,
			snapshotAt: s.snapshotAt.toISOString(),
			consensusScore: s.consensusScore,
			divergenceScore: s.divergenceScore,
			trend: (s.consensusData as any)?.trend || 'stable'
		}));

		return NextResponse.json({ snapshots: formatted }, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error: any) {
		console.error('[Consensus Snapshots] Error:', error);
		return NextResponse.json({ error: error.message || 'Failed to load snapshots' }, { 
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}








