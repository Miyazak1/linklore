'use client';
import { useState, useEffect } from 'react';

type Disagreement = {
	id: string;
	title: string;
	description?: string | null;
	status: string;
	createdAt: Date;
	doc1Id?: string | null;
	doc2Id?: string | null;
	claim1?: string | null;
	claim2?: string | null;
	severity?: string | null;
	confidence?: number | null;
	aiGenerated?: boolean;
};

export default function DisagreementList({ topicId }: { topicId: string }) {
	const [disagreements, setDisagreements] = useState<Disagreement[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadDisagreements();
		// 自动轮询刷新：每10秒检查一次是否有新数据
		const interval = setInterval(() => {
			loadDisagreements();
		}, 10000); // 10秒轮询一次

		// 清理定时器
		return () => {
			clearInterval(interval);
		};
	}, [topicId]);

	const loadDisagreements = async () => {
		try {
			const res = await fetch(`/api/topics/${topicId}/disagreements`);
			const data = await res.json();
			if (res.ok) {
				setDisagreements(data.items || []);
			}
		} catch (err) {
			console.error('Failed to load disagreements:', err);
		} finally {
			setLoading(false);
		}
	};


	const statusColor = (status: string) => {
		switch (status) {
			case 'resolved':
				return 'var(--color-success)';
			case 'researching':
				return 'var(--color-warning)';
			default:
				return 'var(--color-text-secondary)';
		}
	};

	const statusText = (status: string) => {
		switch (status) {
			case 'resolved':
				return '已解决';
			case 'researching':
				return '研究中';
			default:
				return '待处理';
		}
	};

	return (
		<div className="card-academic" style={{ 
			marginBottom: 'var(--spacing-xl)',
			padding: 'var(--spacing-lg)',
			borderLeftColor: 'var(--color-error)'
		}}>
			<div style={{ marginBottom: 'var(--spacing-md)' }}>
				<h3 style={{ 
					margin: 0,
					marginBottom: 'var(--spacing-xs)',
					fontSize: 'var(--font-size-lg)',
					color: 'var(--color-text-primary)'
				}}>AI 分歧分析</h3>
				<p style={{ 
					margin: 0, 
					fontSize: 'var(--font-size-xs)', 
					color: 'var(--color-text-secondary)',
					lineHeight: 'var(--line-height-relaxed)'
				}}>
					AI 自动分析文档间的观点分歧和冲突点
				</p>
			</div>
			{loading ? (
				<p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', fontStyle: 'italic' }}>加载中...</p>
			) : disagreements.length > 0 ? (
				<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
					{disagreements.map((it) => (
						<li
							key={it.id}
							className="card"
							style={{
								padding: 'var(--spacing-md)',
								marginBottom: 'var(--spacing-sm)',
								border: '1px solid var(--color-border-light)'
							}}
						>
							<div style={{ 
								display: 'flex',
								alignItems: 'flex-start',
								gap: 'var(--spacing-xs)',
								marginBottom: 'var(--spacing-xs)'
							}}>
								{it.aiGenerated && (
									<span style={{ 
										fontSize: 'var(--font-size-xs)',
										color: 'var(--color-primary)',
										background: 'rgba(33, 150, 243, 0.1)',
										padding: '2px 6px',
										borderRadius: 'var(--radius-sm)'
									}}>AI</span>
								)}
								<div style={{ 
									fontWeight: 600, 
									fontSize: 'var(--font-size-sm)',
									color: 'var(--color-text-primary)',
									flex: 1
								}}>{it.title}</div>
							</div>
							{it.description && (
								<div style={{ 
									fontSize: 'var(--font-size-xs)',
									color: 'var(--color-text-secondary)',
									marginBottom: 'var(--spacing-xs)',
									lineHeight: 'var(--line-height-relaxed)'
								}}>{it.description}</div>
							)}
							{(it.claim1 || it.claim2) && (
								<div style={{ 
									marginTop: 'var(--spacing-xs)',
									padding: 'var(--spacing-xs)',
									background: 'var(--color-background-subtle)',
									borderRadius: 'var(--radius-sm)',
									fontSize: 'var(--font-size-xs)'
								}}>
									{it.claim1 && (
										<div style={{ marginBottom: 'var(--spacing-xs)' }}>
											<strong style={{ color: 'var(--color-text-secondary)' }}>主题文档：</strong>
											<span style={{ color: 'var(--color-text-primary)' }}>{it.claim1}</span>
										</div>
									)}
									{it.claim2 && (
										<div>
											<strong style={{ color: 'var(--color-text-secondary)' }}>回复文档：</strong>
											<span style={{ color: 'var(--color-text-primary)' }}>{it.claim2}</span>
										</div>
									)}
								</div>
							)}
							<div style={{ 
								display: 'flex', 
								gap: 'var(--spacing-md)', 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--color-text-secondary)',
								marginTop: 'var(--spacing-xs)'
							}}>
								<span style={{ 
									color: statusColor(it.status),
									fontWeight: 500
								}}>{statusText(it.status)}</span>
								{it.severity && (
									<span style={{ 
										color: it.severity === 'high' ? 'var(--color-error)' : 
										       it.severity === 'medium' ? 'var(--color-warning)' : 
										       'var(--color-text-secondary)'
									}}>
										严重程度：{it.severity === 'high' ? '高' : it.severity === 'medium' ? '中' : '低'}
									</span>
								)}
								{it.confidence && (
									<span>置信度：{(it.confidence * 100).toFixed(0)}%</span>
								)}
								<span>{new Date(it.createdAt).toLocaleString('zh-CN')}</span>
							</div>
						</li>
					))}
				</ul>
			) : (
				<p style={{ 
					color: 'var(--color-text-tertiary)', 
					fontSize: 'var(--font-size-sm)',
					fontStyle: 'italic',
					textAlign: 'center',
					padding: 'var(--spacing-md)'
				}}>暂无分歧分析结果。当有至少2个文档评价完成后，系统会自动进行分析。</p>
			)}
		</div>
	);
}

