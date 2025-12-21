'use client';
import { useState, useEffect } from 'react';

// Client-side version of isBlindReviewWindow
function isBlindReviewWindow(createdAt: Date): boolean {
	const now = new Date();
	const diffMs = now.getTime() - createdAt.getTime();
	const diffHours = diffMs / (1000 * 60 * 60);
	return diffHours < 48; // 48 hours blind review window
}

type Topic = {
	id: string;
	title: string;
	authorId: string;
	author: { email: string } | null;
	discipline: string | null;
	createdAt: string;
	documents: Array<{ id: string; createdAt: string }>;
	_count: { documents: number };
};

export default function TopicList() {
	const [topics, setTopics] = useState<Topic[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [discipline, setDiscipline] = useState<string>('');
	const [disciplines, setDisciplines] = useState<string[]>([]);

	useEffect(() => {
		loadTopics();
	}, [page, discipline]);

	const loadTopics = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: '20'
			});
			if (discipline) {
				params.append('discipline', discipline);
			}
			const res = await fetch(`/api/topics/list?${params}`);
			const data = await res.json();
			if (res.ok) {
				setTopics(data.topics || []);
				setTotalPages(data.pagination?.totalPages || 1);
				if (data.disciplines) {
					setDisciplines(data.disciplines);
				}
			}
		} catch (err) {
			console.error('Failed to load topics:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleDisciplineChange = (newDiscipline: string) => {
		setDiscipline(newDiscipline);
		setPage(1); // Reset to first page when filter changes
	};

	if (loading && topics.length === 0) {
		return (
			<div style={{ 
				padding: 'var(--spacing-xxl)', 
				textAlign: 'center',
				color: 'var(--color-text-secondary)',
				fontSize: 'var(--font-size-base)'
			}}>
				加载中...
			</div>
		);
	}

	return (
		<div>
			{disciplines.length > 0 && (
				<div style={{ 
					marginBottom: 'var(--spacing-lg)', 
					display: 'flex', 
					gap: 'var(--spacing-sm)', 
					flexWrap: 'wrap', 
					alignItems: 'center',
					padding: 'var(--spacing-md)',
					background: 'var(--color-background-subtle)',
					borderRadius: 'var(--radius-md)',
					border: '1px solid var(--color-border-light)'
				}}>
					<span style={{ 
						fontSize: 'var(--font-size-sm)', 
						color: 'var(--color-text-secondary)',
						fontWeight: 500,
						marginRight: 'var(--spacing-xs)'
					}}>筛选学科：</span>
					<button
						type="button"
						onClick={() => handleDisciplineChange('')}
						style={{
							padding: 'var(--spacing-xs) var(--spacing-md)',
							fontSize: 'var(--font-size-sm)',
							background: discipline === '' ? 'var(--color-primary)' : 'var(--color-background-paper)',
							color: discipline === '' ? '#fff' : 'var(--color-text-primary)',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-sm)',
							cursor: 'pointer',
							fontWeight: 500,
							transition: 'all var(--transition-fast)'
						}}
						onMouseEnter={(e) => {
							if (discipline !== '') {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
							}
						}}
						onMouseLeave={(e) => {
							if (discipline !== '') {
								e.currentTarget.style.borderColor = 'var(--color-border)';
							}
						}}
					>
						全部
					</button>
					{disciplines.map((d) => (
						<button
							key={d}
							type="button"
							onClick={() => handleDisciplineChange(d)}
							style={{
								padding: 'var(--spacing-xs) var(--spacing-md)',
								fontSize: 'var(--font-size-sm)',
								background: discipline === d ? 'var(--color-primary)' : 'var(--color-background-paper)',
								color: discipline === d ? '#fff' : 'var(--color-text-primary)',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-sm)',
								cursor: 'pointer',
								fontWeight: 500,
								transition: 'all var(--transition-fast)'
							}}
							onMouseEnter={(e) => {
								if (discipline !== d) {
									e.currentTarget.style.borderColor = 'var(--color-primary)';
								}
							}}
							onMouseLeave={(e) => {
								if (discipline !== d) {
									e.currentTarget.style.borderColor = 'var(--color-border)';
								}
							}}
						>
							{d}
						</button>
					))}
				</div>
			)}

			{topics.length === 0 ? (
				<div style={{ 
					color: 'var(--color-text-secondary)', 
					padding: 'var(--spacing-xxl)', 
					textAlign: 'center',
					fontSize: 'var(--font-size-base)',
					background: 'var(--color-background-paper)',
					borderRadius: 'var(--radius-md)',
					border: '1px solid var(--color-border-light)'
				}}>
					{discipline ? `暂无 ${discipline} 学科的话题` : '暂无话题'}
				</div>
			) : (
				<>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
						{topics.map((topic) => {
							const blind = isBlindReviewWindow(new Date(topic.createdAt));
							const authorEmail = blind ? '匿名' : topic.author?.email || '未知';
							const docCount = topic._count?.documents || 0;
							const latestDoc = topic.documents[0];
							return (
								<div
									key={topic.id}
									className="card-academic"
									style={{
										padding: 'var(--spacing-xl)',
										border: '1px solid var(--color-border-light)',
										borderRadius: 'var(--radius-md)',
										background: 'var(--color-background-paper)',
										transition: 'all var(--transition-normal)',
										cursor: 'pointer'
									}}
									onClick={() => window.location.href = `/topics/${topic.id}`}
									onMouseEnter={(e) => {
										e.currentTarget.style.boxShadow = 'var(--shadow-md)';
										e.currentTarget.style.transform = 'translateY(-2px)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
										e.currentTarget.style.transform = 'translateY(0)';
									}}
								>
									<h3 style={{ 
										margin: '0 0 var(--spacing-sm) 0', 
										fontSize: 'var(--font-size-xl)',
										fontWeight: 600,
										lineHeight: 'var(--line-height-tight)'
									}}>
										<a href={`/topics/${topic.id}`} style={{ 
											textDecoration: 'none', 
											color: 'var(--color-primary)',
											transition: 'color var(--transition-fast)'
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.color = 'var(--color-primary-dark)';
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.color = 'var(--color-primary)';
										}}
										>
											{topic.title}
										</a>
									</h3>
									<div style={{ 
										fontSize: 'var(--font-size-sm)', 
										color: 'var(--color-text-secondary)', 
										display: 'flex', 
										gap: 'var(--spacing-md)', 
										flexWrap: 'wrap',
										marginBottom: latestDoc ? 'var(--spacing-sm)' : 0
									}}>
										<span>作者：{authorEmail}</span>
										<span>创建于：{new Date(topic.createdAt).toLocaleString('zh-CN')}</span>
										<span>文档数：{docCount}</span>
										{topic.discipline && <span>学科：{topic.discipline}</span>}
										{blind && (
											<span style={{ 
												color: 'var(--color-warning)',
												fontWeight: 500
											}}>盲评中</span>
										)}
									</div>
									{latestDoc && (
										<div style={{ 
											fontSize: 'var(--font-size-xs)', 
											color: 'var(--color-text-tertiary)', 
											marginTop: 'var(--spacing-xs)',
											fontStyle: 'italic'
										}}>
											最新回复：{new Date(latestDoc.createdAt).toLocaleString('zh-CN')}
										</div>
									)}
								</div>
							);
						})}
					</div>

					{totalPages > 1 && (
						<div style={{ 
							marginTop: 'var(--spacing-xl)', 
							display: 'flex', 
							justifyContent: 'center', 
							gap: 'var(--spacing-md)', 
							alignItems: 'center',
							padding: 'var(--spacing-lg)',
							background: 'var(--color-background-subtle)',
							borderRadius: 'var(--radius-md)',
							border: '1px solid var(--color-border-light)'
						}}>
							<button
								type="button"
								onClick={() => setPage(Math.max(1, page - 1))}
								disabled={page === 1}
								style={{
									padding: 'var(--spacing-sm) var(--spacing-lg)',
									fontSize: 'var(--font-size-sm)',
									background: page === 1 ? 'var(--color-background-paper)' : 'var(--color-primary)',
									color: page === 1 ? 'var(--color-text-disabled)' : '#fff',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									cursor: page === 1 ? 'not-allowed' : 'pointer',
									fontWeight: 500,
									transition: 'all var(--transition-fast)',
									opacity: page === 1 ? 0.6 : 1
								}}
								onMouseEnter={(e) => {
									if (page !== 1) {
										e.currentTarget.style.background = 'var(--color-primary-dark)';
										e.currentTarget.style.transform = 'translateY(-1px)';
									}
								}}
								onMouseLeave={(e) => {
									if (page !== 1) {
										e.currentTarget.style.background = 'var(--color-primary)';
										e.currentTarget.style.transform = 'translateY(0)';
									}
								}}
							>
								上一页
							</button>
							<span style={{ 
								fontSize: 'var(--font-size-sm)', 
								color: 'var(--color-text-secondary)',
								fontWeight: 500
							}}>
								第 {page} / {totalPages} 页
							</span>
							<button
								type="button"
								onClick={() => setPage(Math.min(totalPages, page + 1))}
								disabled={page === totalPages}
								style={{
									padding: 'var(--spacing-sm) var(--spacing-lg)',
									fontSize: 'var(--font-size-sm)',
									background: page === totalPages ? 'var(--color-background-paper)' : 'var(--color-primary)',
									color: page === totalPages ? 'var(--color-text-disabled)' : '#fff',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									cursor: page === totalPages ? 'not-allowed' : 'pointer',
									fontWeight: 500,
									transition: 'all var(--transition-fast)',
									opacity: page === totalPages ? 0.6 : 1
								}}
								onMouseEnter={(e) => {
									if (page !== totalPages) {
										e.currentTarget.style.background = 'var(--color-primary-dark)';
										e.currentTarget.style.transform = 'translateY(-1px)';
									}
								}}
								onMouseLeave={(e) => {
									if (page !== totalPages) {
										e.currentTarget.style.background = 'var(--color-primary)';
										e.currentTarget.style.transform = 'translateY(0)';
									}
								}}
							>
								下一页
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}

