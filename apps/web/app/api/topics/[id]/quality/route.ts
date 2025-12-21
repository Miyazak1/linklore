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
				// Ensure scores is an object (not an array)
				const scoresObj = typeof evaluation.scores === 'object' && !Array.isArray(evaluation.scores) 
					? evaluation.scores as Record<string, any>
					: {};
				// Map Chinese field names from evaluation to quality metrics
				// Rigor = average of 逻辑 and 证据
				const logic = (typeof scoresObj['逻辑'] === 'number' ? scoresObj['逻辑'] : 0) || 0;
				const evidence = (typeof scoresObj['证据'] === 'number' ? scoresObj['证据'] : 0) || 0;
				if (logic > 0 || evidence > 0) {
					totalRigor += (logic + evidence) / 2;
				}
				// Clarity = 结构 score
				const structure = (typeof scoresObj['结构'] === 'number' ? scoresObj['结构'] : 0) || 0;
				if (structure > 0) {
					totalClarity += structure;
				}
				// Citation = 引用 score
				const citation = (typeof scoresObj['引用'] === 'number' ? scoresObj['引用'] : 0) || 0;
				if (citation > 0) {
					totalCitation += citation;
				}
				// Originality = 观点 score
				const viewpoint = (typeof scoresObj['观点'] === 'number' ? scoresObj['观点'] : 0) || 0;
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

