'use client';
import { useState, useEffect } from 'react';
import Avatar from '@/components/ui/Avatar';

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
	type?: string; // 'article' | 'discussion'
	authorId: string;
	author: { 
		email: string;
		name: string | null;
		avatarUrl: string | null;
	} | null;
	discipline: string | null;
	createdAt: string;
	documents: Array<{ id: string; createdAt: string }>;
	_count: { 
		documents: number;
		comments: number; // 评论数
	};
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
							const authorEmail = topic.author?.email || '';
							const authorName = blind ? '匿名' : (topic.author?.name || authorEmail.split('@')[0] || '未知用户');
							const authorAvatarUrl = blind ? null : (topic.author?.avatarUrl || null);
							const docCount = topic._count?.documents || 0;
							const commentCount = topic._count?.comments || 0;
							const latestDoc = topic.documents[0];
							const isArticle = topic.type === 'article';
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
										cursor: 'pointer',
										boxShadow: 'var(--shadow-sm)'
									}}
									onClick={() => window.location.href = `/topics/${topic.id}`}
									onMouseEnter={(e) => {
										e.currentTarget.style.boxShadow = 'var(--shadow-md)';
										e.currentTarget.style.transform = 'translateY(-2px)';
										e.currentTarget.style.borderColor = 'var(--color-primary)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
										e.currentTarget.style.transform = 'translateY(0)';
										e.currentTarget.style.borderColor = 'var(--color-border-light)';
									}}
								>
									{/* 标题区域 */}
									<div style={{
										marginBottom: 'var(--spacing-md)',
										display: 'flex',
										alignItems: 'flex-start',
										gap: 'var(--spacing-sm)',
										flexWrap: 'wrap'
									}}>
										<a 
											href={`/topics/${topic.id}`} 
											style={{ 
												textDecoration: 'none', 
												color: 'var(--color-text-primary)',
												transition: 'color var(--transition-fast)',
												flex: 1,
												minWidth: 0
											}}
											onClick={(e) => e.stopPropagation()}
											onMouseEnter={(e) => {
												e.currentTarget.style.color = 'var(--color-primary)';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.color = 'var(--color-text-primary)';
											}}
										>
											<h3 style={{ 
												margin: 0, 
												fontSize: 'var(--font-size-xl)',
												fontWeight: 700,
												lineHeight: '1.4',
												letterSpacing: '-0.01em'
											}}>
												{topic.title}
											</h3>
										</a>
										{/* 类型标签 */}
										{topic.type === 'article' && (
											<span style={{
												padding: '4px 10px',
												fontSize: 'var(--font-size-xs)',
												fontWeight: 600,
												background: 'var(--color-primary-lighter)',
												color: 'var(--color-primary-dark)',
												borderRadius: 'var(--radius-sm)',
												border: '1px solid var(--color-primary)',
												whiteSpace: 'nowrap',
												flexShrink: 0,
												lineHeight: 1.2
											}}>
												文章
											</span>
										)}
										{(topic.type === 'discussion' || !topic.type) && (
											<span style={{
												padding: '4px 10px',
												fontSize: 'var(--font-size-xs)',
												fontWeight: 600,
												background: 'rgba(102, 126, 234, 0.1)',
												color: 'var(--color-secondary-dark)',
												borderRadius: 'var(--radius-sm)',
												border: '1px solid var(--color-secondary)',
												whiteSpace: 'nowrap',
												flexShrink: 0,
												lineHeight: 1.2
											}}>
												讨论
											</span>
										)}
									</div>

									{/* 元数据区域 - 主要信息 */}
									<div style={{ 
										display: 'flex', 
										gap: 'var(--spacing-lg)', 
										flexWrap: 'wrap',
										marginBottom: 'var(--spacing-sm)',
										alignItems: 'center'
									}}>
										{/* 作者 */}
										<div style={{
											display: 'flex',
											alignItems: 'center',
											gap: 'var(--spacing-xs)'
										}}>
											<span style={{
												fontSize: 'var(--font-size-xs)',
												color: 'var(--color-text-tertiary)',
												fontWeight: 500
											}}>作者</span>
											<div style={{
												display: 'flex',
												alignItems: 'center',
												gap: 'var(--spacing-xs)'
											}}>
												<Avatar
													avatarUrl={authorAvatarUrl}
													name={authorName}
													email={authorEmail}
													size={20}
												/>
												<span style={{
													fontSize: 'var(--font-size-sm)',
													color: 'var(--color-text-primary)',
													fontWeight: 500
												}}>{authorName}</span>
											</div>
										</div>

										{/* 创建时间 */}
										<div style={{
											display: 'flex',
											alignItems: 'center',
											gap: 'var(--spacing-xs)'
										}}>
											<span style={{
												fontSize: 'var(--font-size-xs)',
												color: 'var(--color-text-tertiary)',
												fontWeight: 500
											}}>创建</span>
											<span style={{
												fontSize: 'var(--font-size-sm)',
												color: 'var(--color-text-secondary)',
												fontWeight: 400
											}}>{new Date(topic.createdAt).toLocaleString('zh-CN', { 
												year: 'numeric',
												month: '2-digit',
												day: '2-digit',
												hour: '2-digit',
												minute: '2-digit'
											})}</span>
										</div>

										{/* 文档数 - 文章类型不显示 */}
										{!isArticle && (
											<div style={{
												display: 'flex',
												alignItems: 'center',
												gap: 'var(--spacing-xs)'
											}}>
												<span style={{
													fontSize: 'var(--font-size-xs)',
													color: 'var(--color-text-tertiary)',
													fontWeight: 500
												}}>文档</span>
												<span style={{
													fontSize: 'var(--font-size-sm)',
													color: 'var(--color-text-primary)',
													fontWeight: 600
												}}>{docCount}</span>
											</div>
										)}

										{/* 评论数 */}
										<div style={{
											display: 'flex',
											alignItems: 'center',
											gap: 'var(--spacing-xs)'
										}}>
											<span style={{
												fontSize: 'var(--font-size-xs)',
												color: 'var(--color-text-tertiary)',
												fontWeight: 500
											}}>评论</span>
											<span style={{
												fontSize: 'var(--font-size-sm)',
												color: 'var(--color-text-primary)',
												fontWeight: 600
											}}>{commentCount}</span>
										</div>

										{/* 学科 */}
										{topic.discipline && (
											<div style={{
												display: 'flex',
												alignItems: 'center',
												gap: 'var(--spacing-xs)'
											}}>
												<span style={{
													fontSize: 'var(--font-size-xs)',
													color: 'var(--color-text-tertiary)',
													fontWeight: 500
												}}>学科</span>
												<span style={{
													fontSize: 'var(--font-size-sm)',
													color: 'var(--color-primary)',
													fontWeight: 500
												}}>{topic.discipline}</span>
											</div>
										)}

										{/* 盲评状态 */}
										{blind && (
											<span style={{ 
												padding: '2px 8px',
												fontSize: 'var(--font-size-xs)',
												color: 'var(--color-warning)',
												background: 'rgba(255, 152, 0, 0.1)',
												border: '1px solid var(--color-warning)',
												borderRadius: 'var(--radius-sm)',
												fontWeight: 600,
												whiteSpace: 'nowrap'
											}}>
												盲评中
											</span>
										)}
									</div>

									{/* 最新回复 */}
									{latestDoc && (
										<div style={{ 
											display: 'flex',
											alignItems: 'center',
											gap: 'var(--spacing-xs)',
											marginTop: 'var(--spacing-xs)',
											paddingTop: 'var(--spacing-xs)',
											borderTop: '1px solid var(--color-border-light)'
										}}>
											<span style={{
												fontSize: 'var(--font-size-xs)',
												color: 'var(--color-text-tertiary)',
												fontWeight: 500
											}}>最新回复</span>
											<span style={{
												fontSize: 'var(--font-size-xs)',
												color: 'var(--color-text-secondary)',
												fontWeight: 400
											}}>
												{new Date(latestDoc.createdAt).toLocaleString('zh-CN', { 
													year: 'numeric',
													month: '2-digit',
													day: '2-digit',
													hour: '2-digit',
													minute: '2-digit'
												})}
											</span>
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

