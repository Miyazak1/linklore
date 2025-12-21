import { prisma } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import ConsensusPanel from '@/components/topic/ConsensusPanel';
import DocumentUpload from '@/components/topic/DocumentUpload';
import UserConsensusSelector from '@/components/topic/UserConsensusSelector';
import TopicComments from '@/components/topic/TopicComments';
import DiscussionParticipantWrapper from '@/components/topic/DiscussionParticipantWrapper';
import JoinDiscussionButton from '@/components/topic/JoinDiscussionButton';
import ParticipantAvatars from '@/components/topic/ParticipantAvatars';
// DocumentNode type is still used for documentTree variable, but DocumentTree component is removed
type DocumentNode = {
	id: string;
	author: { email: string };
	createdAt: Date;
	extractedTextHtml: string | null;
	evaluations: any[];
	summaries: Array<{ title: string }>;
	children: DocumentNode[];
	depth: number;
	topic?: { discipline?: string | null };
};
import QualityBadges from '@/components/topic/QualityBadges';
import AnalysisLogic from '@/components/topic/AnalysisLogic';
import { isBlindReviewWindow } from '@/lib/topics/visibility';
import { getDocumentTree } from '@/lib/topics/documentTree';

type Props = { params: Promise<{ id: string }> };

export default async function TopicDetailPage({ params }: Props) {
	try {
		const { id } = await params;
		
		if (!id || typeof id !== 'string') {
			notFound();
		}
		
		const topic = await prisma.topic.findUnique({ 
			where: { id },
			include: { author: { select: { email: true } } }
		});
		
		if (!topic) {
			notFound();
		}
		
		// Get document tree (不加载extractedText以提升性能，只加载根文档的内容)
		const docTree = await getDocumentTree(id, false);
		
		// Find the original document (parentId is null)
		const originalDocNode = docTree.find(node => !node.parentId) || docTree[0];
		
		// 只加载根文档的extractedText（如果需要显示）
		let html = '<p>内容处理中，请稍候...</p>';
		if (originalDocNode?.id) {
			// 按需加载根文档的内容
			const rootDoc = await prisma.document.findUnique({
				where: { id: originalDocNode.id },
				select: { extractedText: true }
			});
			if (rootDoc?.extractedText) {
				html = Buffer.from(rootDoc.extractedText).toString('utf-8');
			}
		}
		const summary = originalDocNode?.summaries?.[0] || null;
		const blind = topic?.createdAt ? isBlindReviewWindow(topic.createdAt) : false;
		const authorEmail = blind ? '匿名' : topic?.author?.email || '未知';
		
		// Convert tree to client-friendly format
		// 注意：extractedText不再包含在树中，需要按需通过API加载
		const convertNode = (node: any): DocumentNode => ({
			id: node.id,
			author: node.author,
			createdAt: node.createdAt,
			extractedTextHtml: null, // 不再包含extractedText，按需通过API加载
			evaluations: node.evaluations.map((evaluation: any) => ({
				...evaluation,
				createdAt: evaluation.createdAt?.toISOString()
			})),
			summaries: node.summaries,
			children: node.children.map(convertNode),
			depth: node.depth,
			topic: { discipline: topic?.discipline || null }
		});
		
		const documentTree = docTree.map(convertNode);
		
		// 并行预加载评论、用户列表和共识数据（提升性能）
		// 注意：这些是可选优化，如果失败不影响页面渲染
		let preloadedComments: any[] = [];
		let preloadedUsers: any[] = [];
		let preloadedConsensus: any = null;
		
		try {
			const [commentsRes, usersRes, consensusRes] = await Promise.allSettled([
				// 预加载评论（最多1000条）
				prisma.topicComment.findMany({
					where: {
						topicId: id,
						deletedAt: null
					},
					select: {
						id: true,
						parentId: true,
						authorId: true,
						author: {
							select: {
								id: true,
								email: true,
								name: true,
								avatarUrl: true
							}
						},
						content: true,
						depth: true,
						createdAt: true,
						updatedAt: true
					},
					orderBy: { createdAt: 'asc' },
					take: 1000
				}),
				// 预加载用户列表（通过API逻辑，这里简化处理）
				prisma.document.findMany({
					where: { topicId: id },
					select: { authorId: true },
					distinct: ['authorId']
				}).then(async (docs) => {
					const userIds = [...new Set(docs.map(d => d.authorId))];
					if (userIds.length === 0) return [];
					
					const users = await prisma.user.findMany({
						where: { id: { in: userIds } },
						select: {
							id: true,
							email: true,
							name: true,
							avatarUrl: true
						}
					});
					
					// 统计每个用户的文档数
					const docCounts = new Map<string, number>();
					docs.forEach(doc => {
						docCounts.set(doc.authorId, (docCounts.get(doc.authorId) || 0) + 1);
					});
					
					return users.map(user => ({
						userId: user.id,
						email: user.email,
						name: user.name,
						avatarUrl: user.avatarUrl,
						documentCount: docCounts.get(user.id) || 0,
						discussionCount: 0 // 这个需要更复杂的计算，暂时设为0
					}));
				}),
				// 预加载共识数据（检查是否有缓存）
				prisma.consensusSnapshot.findFirst({
					where: { topicId: id },
					orderBy: { snapshotAt: 'desc' },
					select: {
						consensusScore: true,
						divergenceScore: true,
						consensusData: true,
						snapshotAt: true
					}
				}).then(snapshot => {
					if (snapshot) {
						return {
							consensus: [],
							unverified: [],
							totalDocs: 0,
							qualityDocs: 0,
							snapshot: {
								consensusScore: snapshot.consensusScore,
								divergenceScore: snapshot.divergenceScore,
								trend: (snapshot.consensusData as any)?.trend || 'stable',
								snapshotAt: snapshot.snapshotAt.toISOString()
							}
						};
					}
					return null;
				})
			]);
			
			// 处理评论数据
			if (commentsRes.status === 'fulfilled') {
				const allComments = commentsRes.value;
				// 计算楼层号
				const floorMap = new Map<string, number>();
				allComments.forEach((comment, index) => {
					floorMap.set(comment.id, index + 1);
				});
				preloadedComments = allComments.map(comment => ({
					...comment,
					floor: floorMap.get(comment.id) || 0,
					createdAt: comment.createdAt.toISOString(),
					updatedAt: comment.updatedAt.toISOString()
				}));
			}
			
			// 处理用户数据
			if (usersRes.status === 'fulfilled') {
				preloadedUsers = usersRes.value;
			}
			
			// 处理共识数据
			if (consensusRes.status === 'fulfilled') {
				preloadedConsensus = consensusRes.value;
			}
		} catch (preloadError) {
			// 预加载失败不影响页面渲染，只是客户端需要自己加载
			console.warn('[TopicDetailPage] Preload failed, components will load on client:', preloadError);
		}
		
		return (
		<main className="topic-detail-container" style={{
			display: 'grid',
			gridTemplateColumns: '1fr 360px',
			gap: 'var(--spacing-xxl)',
			padding: 'var(--spacing-xl)',
			maxWidth: 1600,
			margin: '0 auto',
			background: 'var(--color-background)'
		}}>
			<section style={{ minWidth: 0 }}>
				{/* Header Section */}
				<div className="card-academic" style={{ 
					marginBottom: 'var(--spacing-xl)',
					padding: 'var(--spacing-xl)',
					borderLeftColor: 'var(--color-primary)',
					background: 'var(--color-background-paper)',
					borderRadius: 'var(--radius-lg)',
					boxShadow: 'var(--shadow-sm)',
					border: '1px solid var(--color-border-light)'
				}}>
					<h1 style={{ 
						marginTop: 0,
						marginBottom: (topic as any)?.subtitle ? 'var(--spacing-sm)' : 'var(--spacing-md)',
						fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
						fontWeight: 700,
						background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
						backgroundClip: 'text',
						lineHeight: '1.3',
						letterSpacing: '-0.02em'
					}}>
						{topic?.title || '处理中...'}
					</h1>
					{(topic as any)?.subtitle && (
						<p style={{
							marginTop: 0,
							marginBottom: 'var(--spacing-md)',
							fontSize: 'var(--font-size-lg)',
							fontWeight: 400,
							color: 'var(--color-text-secondary)',
							fontStyle: 'italic',
							lineHeight: 'var(--line-height-relaxed)'
						}}>
							{(topic as any).subtitle}
						</p>
					)}
					<div style={{ 
						display: 'flex',
						flexWrap: 'wrap',
						gap: 'var(--spacing-md)',
						paddingTop: 'var(--spacing-md)',
						borderTop: '1px solid var(--color-border-light)',
						fontSize: 'var(--font-size-sm)',
						color: 'var(--color-text-secondary)'
					}}>
						{blind && (
							<span style={{ 
								color: 'var(--color-warning)',
								fontWeight: 500,
								padding: 'var(--spacing-xs) var(--spacing-sm)',
								background: 'rgba(184, 134, 11, 0.1)',
								borderRadius: 'var(--radius-sm)'
							}}>
								盲评进行中（前 48 小时隐藏作者）
							</span>
						)}
						{!blind && (
							<span>
								<strong style={{ color: 'var(--color-text-primary)' }}>作者：</strong>{authorEmail}
							</span>
						)}
						<span>
							<strong style={{ color: 'var(--color-text-primary)' }}>创建于：</strong>
							{topic?.createdAt ? new Date(topic.createdAt).toLocaleString('zh-CN') : ''}
						</span>
						<span>
							<strong style={{ color: 'var(--color-text-primary)' }}>文档数：</strong>
							{documentTree.length > 0 ? (() => {
								// 计算所有文档数量（包括子文档）
								const countAll = (nodes: typeof documentTree): number => {
									return nodes.reduce((sum, node) => {
										return sum + 1 + countAll(node.children as typeof documentTree);
									}, 0);
								};
								return countAll(documentTree);
							})() : 0}
						</span>
						{topic?.discipline && (
							<span>
								<strong style={{ color: 'var(--color-text-primary)' }}>学科：</strong>{topic.discipline}
							</span>
						)}
					</div>
				</div>
				{/* AI Summary */}
				{summary && (
					<div className="card-academic" style={{ 
						marginBottom: 'var(--spacing-xl)',
						padding: 'var(--spacing-xl)',
						borderLeftColor: 'var(--color-accent-cool)',
						background: 'var(--color-background-paper)',
						borderRadius: 'var(--radius-lg)',
						boxShadow: 'var(--shadow-sm)',
						border: '1px solid var(--color-border-light)'
					}}>
						<h2 style={{ 
							marginTop: 0,
							marginBottom: 'var(--spacing-md)',
							fontSize: 'var(--font-size-2xl)',
							fontWeight: 600,
							color: 'var(--color-primary)',
							paddingBottom: 'var(--spacing-sm)',
							borderBottom: '2px solid var(--color-border-light)'
						}}>
							AI 总结
						</h2>
						{summary.overview && (
							<div style={{ marginBottom: 'var(--spacing-lg)' }}>
								<h3 style={{ 
									marginTop: 0,
									marginBottom: 'var(--spacing-sm)',
									fontSize: 'var(--font-size-lg)',
									fontWeight: 600,
									color: 'var(--color-text-primary)'
								}}>
									概述
								</h3>
								<p style={{ 
									color: 'var(--color-text-primary)',
									lineHeight: 'var(--line-height-relaxed)',
									fontSize: 'var(--font-size-base)',
									margin: 0
								}}>
									{summary.overview}
								</p>
							</div>
						)}
						{Array.isArray(summary.claims) && summary.claims.length > 0 && (
							<div style={{ marginBottom: 'var(--spacing-lg)' }}>
								<h3 style={{ 
									marginTop: 0,
									marginBottom: 'var(--spacing-sm)',
									fontSize: 'var(--font-size-lg)',
									fontWeight: 600,
									color: 'var(--color-text-primary)'
								}}>
									核心观点
								</h3>
								<ul style={{ 
									margin: 0,
									paddingLeft: 'var(--spacing-lg)',
									color: 'var(--color-text-primary)',
									lineHeight: 'var(--line-height-relaxed)'
								}}>
									{summary.claims.filter((claim): claim is string => typeof claim === 'string').map((claim: string, idx: number) => (
										<li key={idx} style={{ marginBottom: 'var(--spacing-xs)' }}>
											{claim}
										</li>
									))}
								</ul>
							</div>
						)}
						{summary.keywords && Array.isArray(summary.keywords) && summary.keywords.length > 0 && (
							<div style={{ 
								paddingTop: 'var(--spacing-md)',
								borderTop: '1px solid var(--color-border-light)'
							}}>
								<h3 style={{ 
									marginTop: 0,
									marginBottom: 'var(--spacing-sm)',
									fontSize: 'var(--font-size-base)',
									fontWeight: 600,
									color: 'var(--color-text-secondary)'
								}}>
									关键词
								</h3>
								<div style={{ 
									display: 'flex',
									flexWrap: 'wrap',
									gap: 'var(--spacing-xs)'
								}}>
									{summary.keywords.map((keyword: string, idx: number) => (
										<span 
											key={idx}
											className="academic-badge"
											style={{
												fontSize: 'var(--font-size-xs)',
												padding: 'var(--spacing-xs) var(--spacing-sm)',
												background: 'var(--color-background-subtle)',
												color: 'var(--color-text-secondary)',
												border: '1px solid var(--color-border-light)',
												borderRadius: 'var(--radius-sm)'
											}}
										>
											{keyword}
										</span>
									))}
								</div>
							</div>
						)}
					</div>
				)}
				{/* Document Content */}
				<div className="card" style={{
					padding: 'var(--spacing-xxl)',
					marginBottom: 'var(--spacing-xl)',
					background: 'var(--color-background-paper)',
					borderRadius: 'var(--radius-lg)',
					boxShadow: 'var(--shadow-sm)',
					border: '1px solid var(--color-border-light)'
				}}>
					<article
						style={{
							maxWidth: '100%',
							margin: '0 auto',
							lineHeight: '1.8',
							fontSize: '18px',
							color: 'var(--color-text-primary)',
							fontFamily: 'var(--font-family-serif)',
							letterSpacing: '0.01em',
							wordSpacing: '0.05em'
						}}
						dangerouslySetInnerHTML={{
							__html: `<style>
								.document-content {
									max-width: 100%;
									margin: 0 auto;
									line-height: 1.8;
									font-size: 18px;
									color: #1a1a1a;
									font-family: var(--font-family-serif);
									letter-spacing: 0.01em;
									word-spacing: 0.05em;
								}
								
								/* 标题样式 */
								.document-content h1 { 
									font-size: 2.25em; 
									margin: 1.5em 0 0.75em 0; 
									border-bottom: 3px solid var(--color-primary); 
									padding-bottom: 0.5em; 
									font-weight: 700;
									color: var(--color-primary);
									line-height: 1.3;
									letter-spacing: -0.02em;
								}
								.document-content h2 { 
									font-size: 1.75em; 
									margin: 1.25em 0 0.6em 0; 
									border-bottom: 2px solid var(--color-border); 
									padding-bottom: 0.4em; 
									font-weight: 600;
									color: var(--color-text-primary);
									line-height: 1.4;
								}
								.document-content h3 { 
									font-size: 1.4em; 
									margin: 1em 0 0.5em 0; 
									font-weight: 600;
									color: var(--color-text-primary);
									line-height: 1.5;
								}
								.document-content h4 { 
									font-size: 1.2em; 
									margin: 0.9em 0 0.4em 0; 
									font-weight: 600;
									color: var(--color-text-primary);
								}
								.document-content h5, .document-content h6 { 
									font-size: 1.1em; 
									margin: 0.8em 0 0.3em 0; 
									font-weight: 600;
									color: var(--color-text-primary);
								}
								
								/* 段落样式 */
								.document-content p { 
									margin: 1.2em 0; 
									line-height: 1.8;
									text-align: left;
								}
								.document-content p:first-child {
									margin-top: 0;
								}
								.document-content p:last-child {
									margin-bottom: 0;
								}
								
								/* 列表样式 */
								.document-content ul, .document-content ol { 
									margin: 1.2em 0; 
									padding-left: 2.5em; 
									line-height: 1.8;
								}
								.document-content li { 
									margin: 0.6em 0; 
									line-height: 1.8;
								}
								.document-content li > p {
									margin: 0.5em 0;
								}
								.document-content ul {
									list-style-type: disc;
								}
								.document-content ol {
									list-style-type: decimal;
								}
								
								/* 引用样式 */
								.document-content blockquote { 
									border-left: 4px solid var(--color-primary); 
									padding: 1em 1.5em; 
									margin: 1.5em 0; 
									color: var(--color-text-secondary); 
									font-style: italic;
									background: var(--color-background-subtle);
									border-radius: 0 var(--radius-md) var(--radius-md) 0;
									line-height: 1.7;
								}
								.document-content blockquote p {
									margin: 0.5em 0;
								}
								.document-content blockquote p:first-child {
									margin-top: 0;
								}
								.document-content blockquote p:last-child {
									margin-bottom: 0;
								}
								
								/* 代码样式 */
								.document-content code { 
									background: var(--color-background-subtle); 
									padding: 0.2em 0.5em; 
									border-radius: var(--radius-sm); 
									font-family: var(--font-family-mono); 
									font-size: 0.9em;
									color: var(--color-primary);
									border: 1px solid var(--color-border-light);
								}
								.document-content pre { 
									background: var(--color-background-subtle); 
									padding: 1.25em; 
									border-radius: var(--radius-md); 
									overflow-x: auto; 
									margin: 1.5em 0;
									border: 1px solid var(--color-border-light);
									box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
								}
								.document-content pre code { 
									background: none; 
									padding: 0;
									border: none;
									font-size: 0.9em;
									line-height: 1.6;
								}
								
								/* 表格样式 */
								.document-content table { 
									border-collapse: collapse; 
									width: 100%; 
									margin: 1.5em 0;
									box-shadow: var(--shadow-sm);
									border-radius: var(--radius-md);
									overflow: hidden;
								}
								.document-content th, .document-content td { 
									border: 1px solid var(--color-border); 
									padding: 0.75em 1em; 
									text-align: left;
									line-height: 1.6;
								}
								.document-content th { 
									background: var(--color-primary); 
									color: white;
									font-weight: 600;
									text-transform: uppercase;
									font-size: 0.9em;
									letter-spacing: 0.05em;
								}
								.document-content td {
									background: var(--color-background-paper);
								}
								.document-content tr:nth-child(even) td {
									background: var(--color-background-subtle);
								}
								
								/* 链接样式 */
								.document-content a { 
									color: var(--color-primary); 
									text-decoration: none;
									border-bottom: 1px solid transparent;
									transition: all 0.2s ease;
								}
								.document-content a:hover { 
									border-bottom-color: var(--color-primary);
									color: var(--color-primary-dark);
								}
								
								/* 图片样式 */
								.document-content img { 
									max-width: 100%; 
									height: auto; 
									margin: 1.5em auto; 
									display: block;
									border-radius: var(--radius-md);
									box-shadow: var(--shadow-md);
								}
								
								/* 分隔线样式 */
								.document-content hr { 
									border: none; 
									border-top: 2px solid var(--color-border); 
									margin: 2.5em 0;
									opacity: 0.5;
								}
								
								/* 强调样式 */
								.document-content strong {
									font-weight: 600;
									color: var(--color-text-primary);
								}
								.document-content em {
									font-style: italic;
									color: var(--color-text-primary);
								}
								
								/* 响应式设计 */
								@media (max-width: 768px) {
									.document-content {
										font-size: 16px;
										line-height: 1.7;
									}
									.document-content h1 {
										font-size: 1.875em;
									}
									.document-content h2 {
										font-size: 1.5em;
									}
									.document-content h3 {
										font-size: 1.25em;
									}
									.document-content pre {
										padding: 1em;
										font-size: 0.85em;
									}
									.document-content table {
										font-size: 0.9em;
									}
									.document-content th, .document-content td {
										padding: 0.5em 0.75em;
									}
								}
							</style>
							<div class="document-content">${html}</div>`
						}}
					/>
				</div>
				
				{/* 参与讨论按钮 - 未参与者可见 */}
				<JoinDiscussionButton topicId={id} />
				
				{/* 讨论者头像列表 - 显示所有参与者 */}
				<ParticipantAvatars topicId={id} maxVisible={8} />
				
				{/* 文档上传 - 只有参与者可见 */}
				<DiscussionParticipantWrapper topicId={id}>
					<DocumentUpload topicId={id} />
				</DiscussionParticipantWrapper>
				
				{/* 分歧和共识分析 - 只有讨论者可见 */}
				<DiscussionParticipantWrapper topicId={id}>
					<UserConsensusSelector topicId={id} initialUsers={preloadedUsers} />
				</DiscussionParticipantWrapper>
				
				{/* 评论区域 - 所有人可见 */}
				<TopicComments topicId={id} initialComments={preloadedComments} />
				
				{/* Export Actions */}
				<div className="card-academic" style={{ 
					marginBottom: 'var(--spacing-xl)',
					padding: 'var(--spacing-lg)',
					borderLeftColor: 'var(--color-accent-cool)'
				}}>
					<h3 style={{ 
						marginTop: 0,
						marginBottom: 'var(--spacing-md)',
						fontSize: 'var(--font-size-lg)',
						color: 'var(--color-text-primary)'
					}}>导出</h3>
					<div style={{ 
						display: 'flex', 
						gap: 'var(--spacing-md)', 
						flexWrap: 'wrap'
					}}>
						<a 
							href={`/api/topics/${id}/export`} 
							className="btn-academic"
							style={{ textDecoration: 'none' }}
						>
							导出话题包 ZIP
						</a>
						<a 
							href={`/api/topics/${id}/export-markdown`} 
							className="btn-academic"
							style={{ textDecoration: 'none' }}
						>
							导出 Markdown
						</a>
					</div>
				</div>
			</section>
			<aside style={{ 
				display: 'flex',
				flexDirection: 'column',
				gap: 'var(--spacing-lg)',
				position: 'sticky',
				top: 'var(--spacing-xl)',
				alignSelf: 'start',
				maxHeight: 'calc(100vh - var(--spacing-xl) * 2)',
				overflowY: 'auto'
			}}>
				{/* AI Evaluation */}
				<div className="card-academic" style={{ 
					borderLeftColor: 'var(--color-primary)',
					padding: 'var(--spacing-lg)'
				}}>
					<div style={{ 
						marginBottom: 'var(--spacing-md)'
					}}>
						<h3 style={{ 
							margin: 0,
							fontSize: 'var(--font-size-lg)',
							color: 'var(--color-primary)'
						}}>AI 评价</h3>
					</div>
					{originalDocNode?.evaluations && originalDocNode.evaluations.length > 0 ? (
						<div>
							{originalDocNode.evaluations.map((evaluation: any) => {
								const scores = typeof evaluation.scores === 'object' ? evaluation.scores : {};
								const scoreEntries = Object.entries(scores);
								
								// Calculate weighted average score based on discipline
								const discipline = evaluation.discipline || 'default';
								const RUBRICS: Record<string, Record<string, number>> = {
									default: { '结构': 0.2, '逻辑': 0.25, '观点': 0.25, '证据': 0.2, '引用': 0.1 },
									'哲学': { '结构': 0.15, '逻辑': 0.3, '观点': 0.3, '论证': 0.15, '引用': 0.1 },
									'文学': { '结构': 0.2, '表达': 0.3, '观点': 0.25, '材料': 0.15, '引用': 0.1 },
									'历史': { '结构': 0.15, '逻辑': 0.2, '观点': 0.25, '史料': 0.3, '引用': 0.1 },
									'科学': { '结构': 0.15, '逻辑': 0.25, '观点': 0.2, '数据': 0.3, '引用': 0.1 }
								};
								const weights = RUBRICS[discipline] || RUBRICS.default;
								
								let weightedSum = 0;
								let totalWeight = 0;
								scoreEntries.forEach(([key, value]) => {
									const weight = weights[key] || 0;
									const score = typeof value === 'number' ? value : 0;
									weightedSum += score * weight;
									totalWeight += weight;
								});
								const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
								
								return (
									<div key={evaluation.id}>
										<div style={{ 
											fontWeight: 600, 
											marginBottom: 'var(--spacing-sm)',
											fontSize: 'var(--font-size-sm)',
											color: 'var(--color-text-primary)',
											paddingBottom: 'var(--spacing-xs)',
											borderBottom: '1px solid var(--color-border-light)'
										}}>
											学科：{discipline === 'default' ? '通用' : discipline}
										</div>
										<div style={{ 
											display: 'flex',
											flexDirection: 'column',
											gap: 'var(--spacing-xs)',
											marginTop: 'var(--spacing-sm)',
											marginBottom: 'var(--spacing-md)'
										}}>
											{scoreEntries.filter(([key]) => key !== '_reasoning').map(([key, value]) => {
												const weight = weights[key] || 0;
												const reasoning = (scores as any)?._reasoning?.[key] || null;
												return (
													<div key={key} style={{ 
														padding: 'var(--spacing-xs)',
														borderRadius: 'var(--radius-sm)',
														background: reasoning ? 'var(--color-background-subtle)' : 'transparent'
													}}>
														<div style={{ 
															display: 'flex',
															justifyContent: 'space-between',
															alignItems: 'center',
															fontSize: 'var(--font-size-sm)'
														}}>
															<span style={{ color: 'var(--color-text-secondary)' }}>
																{key}
																{weight > 0 ? (
																	<span style={{ 
																		fontSize: 'var(--font-size-xs)', 
																		color: 'var(--color-text-tertiary)',
																		marginLeft: 'var(--spacing-xs)'
																	}}>
																		({(weight * 100).toFixed(0)}%)
																	</span>
																) : null}
																：
															</span>
															<span style={{ 
																fontWeight: 600,
																color: typeof value === 'number' && value >= 8 ? 'var(--color-success)' : 
																       typeof value === 'number' && value >= 6 ? 'var(--color-warning)' : 
																       'var(--color-text-primary)'
															}}>
																{typeof value === 'number' ? `${value}/10` : (value ? String(value) : 'N/A')}
															</span>
														</div>
														{reasoning && (
															<div style={{ 
																marginTop: 'var(--spacing-xs)',
																fontSize: 'var(--font-size-xs)',
																color: 'var(--color-text-tertiary)',
																fontStyle: 'italic',
																lineHeight: 'var(--line-height-relaxed)',
																paddingLeft: 'var(--spacing-sm)',
																borderLeft: '2px solid var(--color-border-light)'
															}}>
																评分依据：{reasoning}
															</div>
														)}
													</div>
												);
											})}
										</div>
										{/* Overall Score with Calculation */}
										<div style={{ 
											marginTop: 'var(--spacing-md)',
											paddingTop: 'var(--spacing-md)',
											borderTop: '2px solid var(--color-border)'
										}}>
											<div style={{ 
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
												marginBottom: 'var(--spacing-xs)'
											}}>
												<span style={{ 
													fontSize: 'var(--font-size-sm)',
													fontWeight: 600,
													color: 'var(--color-text-primary)'
												}}>
													整体评分：
												</span>
												<span style={{ 
													fontSize: 'var(--font-size-lg)',
													fontWeight: 700,
													color: overallScore >= 8 ? 'var(--color-success)' : 
													       overallScore >= 6 ? 'var(--color-warning)' : 
													       'var(--color-error)'
												}}>
													{overallScore.toFixed(1)}/10
												</span>
											</div>
											<div style={{ 
												fontSize: 'var(--font-size-xs)',
												color: 'var(--color-text-tertiary)',
												fontStyle: 'italic',
												marginTop: 'var(--spacing-xs)',
												paddingTop: 'var(--spacing-xs)',
												borderTop: '1px solid var(--color-border-light)'
											}}>
												计算方式：加权平均 = Σ(各维度得分 × 权重) / Σ权重
												<br />
												示例：{scoreEntries.filter(([key]) => key !== '_reasoning').slice(0, 3).map(([key, value]) => {
													const weight = weights[key] || 0;
													return `${key}(${value}×${(weight * 100).toFixed(0)}%)`;
												}).join(' + ')} + ... = {overallScore.toFixed(1)}
											</div>
										</div>
										{evaluation.verdict && (
											<div style={{ 
												marginTop: 'var(--spacing-md)',
												paddingTop: 'var(--spacing-md)',
												borderTop: '1px solid var(--color-border-light)',
												fontSize: 'var(--font-size-sm)', 
												color: 'var(--color-text-secondary)', 
												lineHeight: 'var(--line-height-relaxed)',
												fontStyle: 'italic'
											}}>
												{evaluation.verdict}
											</div>
										)}
									</div>
								);
							})}
						</div>
					) : (
						<p style={{ 
							color: 'var(--color-text-tertiary)', 
							fontSize: 'var(--font-size-sm)',
							fontStyle: 'italic'
						}}>
							评价生成中，请稍候...
						</p>
					)}
				</div>
				<ConsensusPanel topicId={id} initialData={preloadedConsensus} />
				<QualityBadges topicId={id} />
				<AnalysisLogic />
			</aside>
		</main>
		);
	} catch (err: any) {
		console.error('[TopicDetailPage] Error:', err);
		// If it's a known error (like topic not found), use notFound
		if (err.message?.includes('not found') || err.message?.includes('不存在')) {
			notFound();
		}
		// For other errors, throw to trigger error boundary
		throw err;
	}
}
