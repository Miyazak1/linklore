import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET() {
	const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const topics = await prisma.topic.findMany({ where: { createdAt: { gte: since } } });
	const docs = await prisma.document.findMany({ where: { createdAt: { gte: since } } });
	const evals = await prisma.evaluation.findMany({ where: { createdAt: { gte: since } } });
	const disagreements = await prisma.disagreement.findMany({ where: { createdAt: { gte: since } } });
	return NextResponse.json({
		topics: topics.length,
		documents: docs.length,
		evaluations: evals.length,
		disagreements: disagreements.length
	});
}











