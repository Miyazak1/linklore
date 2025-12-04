import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const topic = await prisma.topic.findUnique({
			where: { id },
			include: {
				author: { select: { email: true } },
				documents: {
					include: {
						author: { select: { email: true } },
						summaries: { orderBy: { id: 'desc' }, take: 1 },
						evaluations: { orderBy: { createdAt: 'desc' }, take: 1 }
					},
					orderBy: { createdAt: 'asc' }
				}
			}
		});

		if (!topic) {
			return NextResponse.json({ error: '话题不存在' }, { status: 404 });
		}

		// Generate Markdown content
		let markdown = `# ${topic.title}\n\n`;
		markdown += `**作者**: ${topic.author.email}\n`;
		markdown += `**创建时间**: ${new Date(topic.createdAt).toLocaleString('zh-CN')}\n`;
		if (topic.discipline) {
			markdown += `**学科**: ${topic.discipline}\n`;
		}
		markdown += `\n---\n\n`;

		// Add documents
		topic.documents.forEach((doc, idx) => {
			markdown += `## 文档 #${idx + 1}\n\n`;
			markdown += `**作者**: ${doc.author.email}\n`;
			markdown += `**上传时间**: ${new Date(doc.createdAt).toLocaleString('zh-CN')}\n`;
			markdown += `**文件**: ${doc.fileKey}\n\n`;

			// Add summary if available
			const summary = doc.summaries[0];
			if (summary) {
				markdown += `### 摘要\n\n`;
				markdown += `**标题**: ${summary.title}\n\n`;
				markdown += `**概述**: ${summary.overview}\n\n`;

				if (Array.isArray(summary.claims) && summary.claims.length > 0) {
					markdown += `**核心观点**:\n`;
					summary.claims.forEach((claim: string) => {
						markdown += `- ${claim}\n`;
					});
					markdown += `\n`;
				}

				if (Array.isArray(summary.keywords) && summary.keywords.length > 0) {
					markdown += `**关键词**: ${summary.keywords.join(', ')}\n\n`;
				}
			}

			// Add evaluation if available
			const evaluation = doc.evaluations[0];
			if (evaluation && typeof evaluation.scores === 'object') {
				const scores = evaluation.scores as any;
				markdown += `### AI 评价\n\n`;
				if (scores.structure) markdown += `- 结构: ${scores.structure}/10\n`;
				if (scores.logic) markdown += `- 逻辑: ${scores.logic}/10\n`;
				if (scores.viewpoint) markdown += `- 观点: ${scores.viewpoint}/10\n`;
				if (scores.evidence) markdown += `- 证据: ${scores.evidence}/10\n`;
				if (scores.citation) markdown += `- 引用: ${scores.citation}/10\n`;
				if (evaluation.verdict) {
					markdown += `\n**综合评价**: ${evaluation.verdict}\n\n`;
				}
			}

			markdown += `---\n\n`;
		});

		return new NextResponse(markdown, {
			status: 200,
			headers: {
				'Content-Type': 'text/markdown; charset=utf-8',
				'Content-Disposition': `attachment; filename="topic-${id}.md"`
			}
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '导出失败' }, { status: 500 });
	}
}










