import { prisma } from '@/lib/db/client';
import WeeklyDigest from '@/components/digest/WeeklyDigest';

export default async function DigestPage() {
	// Get data for the past 7 days
	const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	
	const topics = await prisma.topic.findMany({
		where: { createdAt: { gte: since } },
		include: {
			author: { select: { email: true } },
			_count: { select: { documents: true } }
		},
		orderBy: { createdAt: 'desc' }
	});

	const docs = await prisma.document.findMany({
		where: { createdAt: { gte: since } },
		include: {
			author: { select: { email: true } },
			topic: { select: { id: true, title: true } }
		},
		orderBy: { createdAt: 'desc' },
		take: 20
	});

	const disagreements = await prisma.disagreement.findMany({
		where: { createdAt: { gte: since } },
		orderBy: { createdAt: 'desc' }
	});

	// Get topics for disagreements separately
	const disagreementTopicIds = disagreements.map((d: { topicId: string }) => d.topicId);
	const disagreementTopics = await prisma.topic.findMany({
		where: { id: { in: disagreementTopicIds } },
		select: { id: true, title: true }
	});
	const topicMap = new Map(disagreementTopics.map((t: { id: string; title: string }) => [t.id, t]));
	const disagreementsWithTopics = disagreements.map((d: { topicId: string; id: string; title: string; status: string; createdAt: Date }) => ({
		...d,
		topic: topicMap.get(d.topicId) || { id: d.topicId, title: '未知话题' }
	}));

	// Get consensus data for active topics
	const activeTopicIds = topics.map((t: { id: string }) => t.id);
	const allDocs = await prisma.document.findMany({
		where: { topicId: { in: activeTopicIds } },
		include: {
			summaries: { orderBy: { id: 'desc' }, take: 1 }
		}
	});

	return (
		<main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
			<h1 style={{ marginBottom: 8 }}>周报摘要</h1>
			<p style={{ color: '#666', marginBottom: 24 }}>
				过去 7 天的讨论活动总结
			</p>
			<WeeklyDigest
				topics={topics}
				documents={docs}
				disagreements={disagreementsWithTopics}
				allDocs={allDocs}
			/>
		</main>
	);
}

