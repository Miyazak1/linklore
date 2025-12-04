'use client';

type Topic = {
	id: string;
	title: string;
	createdAt: Date;
	discipline: string | null;
	author: { email: string };
	_count: { documents: number };
};

type Document = {
	id: string;
	createdAt: Date;
	author: { email: string };
	topic: { id: string; title: string };
};

type Disagreement = {
	id: string;
	title: string;
	status: string;
	createdAt: Date;
	topic: { id: string; title: string };
};

type DocWithSummary = {
	id: string;
	topicId: string;
	summaries: Array<{
		claims: any;
		counterpoints: any;
	}>;
};

export default function WeeklyDigest({
	topics,
	documents,
	disagreements,
	allDocs
}: {
	topics: Topic[];
	documents: Document[];
	disagreements: Disagreement[];
	allDocs: DocWithSummary[];
}) {
	// Calculate statistics
	const totalTopics = topics.length;
	const totalDocuments = documents.length;
	const totalDisagreements = disagreements.length;
	const activeUsers = new Set([
		...topics.map(t => t.author.email),
		...documents.map(d => d.author.email)
	]).size;

	// Group documents by topic
	const docsByTopic = new Map<string, Document[]>();
	documents.forEach(doc => {
		const topicId = doc.topic.id;
		if (!docsByTopic.has(topicId)) {
			docsByTopic.set(topicId, []);
		}
		docsByTopic.get(topicId)!.push(doc);
	});

	// Find most active topics
	const topicActivity = Array.from(docsByTopic.entries())
		.map(([topicId, docs]) => {
			const topic = topics.find(t => t.id === topicId);
			return {
				topicId,
				topicTitle: topic?.title || '未知话题',
				docCount: docs.length,
				latestDoc: docs[0]
			};
		})
		.sort((a, b) => b.docCount - a.docCount)
		.slice(0, 5);

	return (
		<div>
			{/* Statistics Summary */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
				<div style={{ padding: 20, background: '#f9f9f9', borderRadius: 8, textAlign: 'center' }}>
					<div style={{ fontSize: '2em', fontWeight: 'bold', color: '#1976d2', marginBottom: 8 }}>
						{totalTopics}
					</div>
					<div style={{ color: '#666' }}>新话题</div>
				</div>
				<div style={{ padding: 20, background: '#f9f9f9', borderRadius: 8, textAlign: 'center' }}>
					<div style={{ fontSize: '2em', fontWeight: 'bold', color: '#4caf50', marginBottom: 8 }}>
						{totalDocuments}
					</div>
					<div style={{ color: '#666' }}>新文档</div>
				</div>
				<div style={{ padding: 20, background: '#f9f9f9', borderRadius: 8, textAlign: 'center' }}>
					<div style={{ fontSize: '2em', fontWeight: 'bold', color: '#ff9800', marginBottom: 8 }}>
						{activeUsers}
					</div>
					<div style={{ color: '#666' }}>活跃用户</div>
				</div>
				<div style={{ padding: 20, background: '#f9f9f9', borderRadius: 8, textAlign: 'center' }}>
					<div style={{ fontSize: '2em', fontWeight: 'bold', color: '#d32f2f', marginBottom: 8 }}>
						{totalDisagreements}
					</div>
					<div style={{ color: '#666' }}>分歧登记</div>
				</div>
			</div>

			{/* Most Active Topics */}
			{topicActivity.length > 0 && (
				<div style={{ marginBottom: 32 }}>
					<h2 style={{ marginBottom: 16 }}>最活跃话题</h2>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						{topicActivity.map((item) => (
							<div
								key={item.topicId}
								style={{
									padding: 16,
									background: '#fff',
									border: '1px solid #e0e0e0',
									borderRadius: 8
								}}
							>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<div>
										<h3 style={{ margin: '0 0 4px 0', fontSize: '1em' }}>
											<a href={`/topics/${item.topicId}`} style={{ textDecoration: 'none', color: '#1976d2' }}>
												{item.topicTitle}
											</a>
										</h3>
										<div style={{ fontSize: '0.9em', color: '#666' }}>
											{item.docCount} 个回应文档
										</div>
									</div>
									<div style={{ fontSize: '0.85em', color: '#888' }}>
										{item.latestDoc && new Date(item.latestDoc.createdAt).toLocaleString('zh-CN')}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Recent Disagreements */}
			{disagreements.length > 0 && (
				<div style={{ marginBottom: 32 }}>
					<h2 style={{ marginBottom: 16 }}>新登记的分歧</h2>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						{disagreements.slice(0, 10).map((d) => (
							<div
								key={d.id}
								style={{
									padding: 12,
									background: '#fff',
									border: '1px solid #e0e0e0',
									borderRadius: 8
								}}
							>
								<div style={{ fontWeight: '500', marginBottom: 4 }}>{d.title}</div>
								<div style={{ fontSize: '0.85em', color: '#666', display: 'flex', gap: 12 }}>
									<span>
										话题：<a href={`/topics/${d.topic.id}`} style={{ color: '#1976d2' }}>{d.topic.title}</a>
									</span>
									<span>状态：{d.status === 'resolved' ? '已解决' : d.status === 'researching' ? '研究中' : '待处理'}</span>
									<span>{new Date(d.createdAt).toLocaleString('zh-CN')}</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Recent Topics */}
			{topics.length > 0 && (
				<div>
					<h2 style={{ marginBottom: 16 }}>新话题</h2>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						{topics.slice(0, 10).map((topic) => (
							<div
								key={topic.id}
								style={{
									padding: 12,
									background: '#fff',
									border: '1px solid #e0e0e0',
									borderRadius: 8
								}}
							>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<div>
										<h3 style={{ margin: '0 0 4px 0', fontSize: '1em' }}>
											<a href={`/topics/${topic.id}`} style={{ textDecoration: 'none', color: '#1976d2' }}>
												{topic.title}
											</a>
										</h3>
										<div style={{ fontSize: '0.85em', color: '#666' }}>
											{topic.author.email} · {topic._count.documents} 个文档
											{topic.discipline && ` · ${topic.discipline}`}
										</div>
									</div>
									<div style={{ fontSize: '0.85em', color: '#888' }}>
										{new Date(topic.createdAt).toLocaleString('zh-CN')}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}










