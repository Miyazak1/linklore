import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import JSZip from 'jszip';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const topic = await prisma.topic.findUnique({ where: { id } });
	if (!topic) return NextResponse.json({ error: '话题不存在' }, { status: 404 });
	const docs = await prisma.document.findMany({ where: { topicId: id }, orderBy: { createdAt: 'asc' } });
	const summaries = await prisma.summary.findMany({ where: { documentId: { in: docs.map((d) => d.id) } } });
	const evals = await prisma.evaluation.findMany({ where: { documentId: { in: docs.map((d) => d.id) } } });

	const zip = new JSZip();
	zip.file('topic.json', JSON.stringify(topic, null, 2));
	zip.file('documents.json', JSON.stringify(docs, null, 2));
	zip.file('summaries.json', JSON.stringify(summaries, null, 2));
	zip.file('evaluations.json', JSON.stringify(evals, null, 2));

	const blob = await zip.generateAsync({ type: 'nodebuffer' });
	return new NextResponse(blob, {
		status: 200,
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="topic-${id}.zip"`
		}
	});
}


