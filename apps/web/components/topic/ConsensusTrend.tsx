'use client';

import { useState, useEffect } from 'react';

interface ConsensusSnapshot {
	id: string;
	snapshotAt: string;
	consensusScore: number | null;
	divergenceScore: number | null;
	trend?: 'converging' | 'diverging' | 'stable';
}

interface Props {
	topicId: string;
}

export default function ConsensusTrend({ topicId }: Props) {
	const [snapshots, setSnapshots] = useState<ConsensusSnapshot[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadSnapshots();
	}, [topicId]);

	const loadSnapshots = async () => {
		try {
			const res = await fetch(`/api/topics/${topicId}/consensus/snapshots`);
			if (res.ok) {
				const data = await res.json();
				setSnapshots(data.snapshots || []);
			}
		} catch (err) {
			console.error('Failed to load snapshots:', err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="card-academic" style={{ padding: 'var(--spacing-md)' }}>
				<p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>加载中...</p>
			</div>
		);
	}

	if (snapshots.length === 0) {
		return (
			<div className="card-academic" style={{ padding: 'var(--spacing-md)' }}>
				<h3 style={{ 
					marginTop: 0,
					marginBottom: 'var(--spacing-sm)',
					fontSize: 'var(--font-size-lg)',
					color: 'var(--color-primary)'
				}}>共识趋势</h3>
				<p style={{ 
					color: 'var(--color-text-tertiary)', 
					fontSize: 'var(--font-size-sm)',
					fontStyle: 'italic'
				}}>暂无共识快照数据</p>
			</div>
		);
	}

	// 简单的趋势可视化（文本形式）
	const latest = snapshots[0];
	const trendIcon = latest.trend === 'converging' ? '📈' : 
	                  latest.trend === 'diverging' ? '📉' : '➡️';
	const trendText = latest.trend === 'converging' ? '趋于一致' : 
	                  latest.trend === 'diverging' ? '趋于分歧' : '保持稳定';

	return (
		<div className="card-academic" style={{ padding: 'var(--spacing-md)' }}>
			<h3 style={{ 
				marginTop: 0,
				marginBottom: 'var(--spacing-md)',
				fontSize: 'var(--font-size-lg)',
				color: 'var(--color-primary)'
			}}>共识趋势</h3>
			
			{latest && (
				<div style={{ marginBottom: 'var(--spacing-md)' }}>
					<div style={{ 
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-sm)',
						marginBottom: 'var(--spacing-xs)'
					}}>
						<span style={{ fontSize: 'var(--font-size-lg)' }}>{trendIcon}</span>
						<span style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							{trendText}
						</span>
					</div>
					
					{latest.consensusScore !== null && (
						<div style={{ 
							marginBottom: 'var(--spacing-xs)',
							fontSize: 'var(--font-size-sm)',
							color: 'var(--color-text-secondary)'
						}}>
							共识度：<strong style={{ color: 'var(--color-primary)' }}>
								{(latest.consensusScore * 100).toFixed(1)}%
							</strong>
						</div>
					)}
					
					{latest.divergenceScore !== null && (
						<div style={{ 
							marginBottom: 'var(--spacing-xs)',
							fontSize: 'var(--font-size-sm)',
							color: 'var(--color-text-secondary)'
						}}>
							分歧度：<strong style={{ color: 'var(--color-error)' }}>
								{(latest.divergenceScore * 100).toFixed(1)}%
							</strong>
						</div>
					)}
					
					<div style={{ 
						fontSize: 'var(--font-size-xs)',
						color: 'var(--color-text-tertiary)',
						marginTop: 'var(--spacing-sm)'
					}}>
						更新时间：{new Date(latest.snapshotAt).toLocaleString('zh-CN')}
					</div>
				</div>
			)}
			
			{snapshots.length > 1 && (
				<div style={{ 
					marginTop: 'var(--spacing-md)',
					paddingTop: 'var(--spacing-md)',
					borderTop: '1px solid var(--color-border-light)'
				}}>
					<div style={{ 
						fontSize: 'var(--font-size-xs)',
						color: 'var(--color-text-secondary)',
						marginBottom: 'var(--spacing-xs)'
					}}>
						历史快照（最近 {Math.min(5, snapshots.length)} 个）：
					</div>
					<div style={{ 
						display: 'flex',
						flexDirection: 'column',
						gap: 'var(--spacing-xs)'
					}}>
						{snapshots.slice(0, 5).map((snapshot, idx) => (
							<div key={snapshot.id} style={{ 
								fontSize: 'var(--font-size-xs)',
								color: 'var(--color-text-tertiary)',
								display: 'flex',
								justifyContent: 'space-between'
							}}>
								<span>
									{new Date(snapshot.snapshotAt).toLocaleDateString('zh-CN')}
								</span>
								{snapshot.consensusScore !== null && (
									<span>
										共识度: {(snapshot.consensusScore * 100).toFixed(0)}%
									</span>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}








