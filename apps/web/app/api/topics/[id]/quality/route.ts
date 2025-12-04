import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const topic = await prisma.topic.findUnique({ where: { id } });
		if (!topic) return NextResponse.json({ error: '话题不存在' }, { status: 404 });

		// Get all documents with evaluations
		const docs = await prisma.document.findMany({
			where: { topicId: id },
			include: {
				evaluations: { orderBy: { createdAt: 'desc' }, take: 1 }
			}
		});

		// Calculate quality metrics from evaluations
		let totalRigor = 0;
		let totalClarity = 0;
		let totalCitation = 0;
		let totalOriginality = 0;
		let count = 0;

		docs.forEach((doc) => {
			const evaluation = doc.evaluations[0];
			if (evaluation && evaluation.scores) {
				const scores = typeof evaluation.scores === 'object' ? evaluation.scores : {};
				// Map Chinese field names from evaluation to quality metrics
				// Rigor = average of 逻辑 and 证据
				const logic = (scores['逻辑'] as number) || 0;
				const evidence = (scores['证据'] as number) || 0;
				if (logic > 0 || evidence > 0) {
					totalRigor += (logic + evidence) / 2;
				}
				// Clarity = 结构 score
				const structure = (scores['结构'] as number) || 0;
				if (structure > 0) {
					totalClarity += structure;
				}
				// Citation = 引用 score
				const citation = (scores['引用'] as number) || 0;
				if (citation > 0) {
					totalCitation += citation;
				}
				// Originality = 观点 score
				const viewpoint = (scores['观点'] as number) || 0;
				if (viewpoint > 0) {
					totalOriginality += viewpoint;
				}
				count++;
			}
		});

		const metrics = {
			rigor: count > 0 ? totalRigor / count : null,
			clarity: count > 0 ? totalClarity / count : null,
			citation: count > 0 ? totalCitation / count : null,
			originality: count > 0 ? totalOriginality / count : null
		};

		return NextResponse.json({ metrics });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '计算失败' }, { status: 500 });
	}
}

