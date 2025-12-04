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

export default function ConsensusTrendChart({ topicId }: Props) {
	const [snapshots, setSnapshots] = useState<ConsensusSnapshot[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadSnapshots();
		// 自动刷新：每10秒更新一次
		const interval = setInterval(() => {
			loadSnapshots();
		}, 10000);
		return () => clearInterval(interval);
	}, [topicId]);

	const loadSnapshots = async () => {
		try {
			const res = await fetch(`/api/topics/${topicId}/consensus/snapshots`);
			if (res.ok) {
				const data = await res.json();
				const snapshots = data.snapshots || [];
				console.log(`[ConsensusTrendChart] Loaded ${snapshots.length} snapshots for topic ${topicId}`);
				if (snapshots.length > 0) {
					console.log(`[ConsensusTrendChart] First snapshot:`, {
						time: snapshots[0].snapshotAt,
						consensusScore: snapshots[0].consensusScore,
						divergenceScore: snapshots[0].divergenceScore
					});
					console.log(`[ConsensusTrendChart] Last snapshot:`, {
						time: snapshots[snapshots.length - 1].snapshotAt,
						consensusScore: snapshots[snapshots.length - 1].consensusScore,
						divergenceScore: snapshots[snapshots.length - 1].divergenceScore
					});
				}
				setSnapshots(snapshots);
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
				<p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>加载趋势数据中...</p>
			</div>
		);
	}

	if (snapshots.length < 2) {
		return null; // 数据不足，不显示图表
	}

	// 准备图表数据（最近20个快照，按时间正序）
	// 快照按时间倒序排列（最新的在前），需要反转并按时间正序显示
	const chartData = snapshots.slice().reverse().slice(-20);
	const maxScore = 1.0;
	const chartHeight = 120;
	const chartWidth = '100%';

	console.log(`[ConsensusTrendChart] Processing ${chartData.length} snapshots for chart`);
	
	// 计算趋势线（只使用有效的共识度数据）
	const consensusPoints = chartData
		.map((s, idx) => ({
			x: idx,
			y: s.consensusScore !== null && typeof s.consensusScore === 'number' && !isNaN(s.consensusScore)
				? s.consensusScore 
				: null,
			score: s.consensusScore,
			time: s.snapshotAt
		}))
		.filter(p => p.y !== null && p.score !== null && typeof p.score === 'number' && !isNaN(p.score))
		.map(p => ({ x: p.x, y: p.y as number, score: p.score as number, time: p.time }));

	console.log(`[ConsensusTrendChart] Valid consensus points: ${consensusPoints.length}`);
	if (consensusPoints.length > 0) {
		const scores = consensusPoints.map(p => p.y);
		console.log(`[ConsensusTrendChart] Consensus score range:`, {
			min: Math.min(...scores),
			max: Math.max(...scores),
			avg: scores.reduce((sum, y) => sum + y, 0) / scores.length
		});
	}

	if (consensusPoints.length === 0) {
		return null;
	}

	// 生成SVG路径
	const pathPoints = consensusPoints.map((point, idx) => {
		const x = (idx / (consensusPoints.length - 1 || 1)) * 100;
		const y = 100 - (point.y / maxScore) * 100;
		return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
	}).join(' ');

	return (
		<div className="card-academic" style={{ 
			padding: 'var(--spacing-md)',
			borderLeftColor: 'var(--color-primary)'
		}}>
			<h4 style={{ 
				marginTop: 0,
				marginBottom: 'var(--spacing-md)',
				fontSize: 'var(--font-size-base)',
				color: 'var(--color-primary)',
				fontWeight: 600
			}}>
				共识趋势图
			</h4>
			
			<div style={{ 
				position: 'relative',
				width: chartWidth,
				height: chartHeight,
				marginBottom: 'var(--spacing-sm)'
			}}>
				{/* 背景网格 */}
				<svg width="100%" height={chartHeight} style={{ position: 'absolute', top: 0, left: 0 }}>
					{/* 网格线 */}
					{[0, 25, 50, 75, 100].map(y => (
						<line
							key={y}
							x1="0"
							y1={y}
							x2="100%"
							y2={y}
							stroke="var(--color-border-light)"
							strokeWidth="1"
							strokeDasharray="2,2"
						/>
					))}
					{/* Y轴标签 - SVG坐标系中y=0在顶部，所以需要反转 */}
					{[0, 0.25, 0.5, 0.75, 1.0].map((value, idx) => {
						const y = chartHeight - (idx * (chartHeight / 4)); // 从底部开始计算
						return (
							<text
								key={value}
								x="0"
								y={y + 4}
								fontSize="10"
								fill="var(--color-text-tertiary)"
							>
								{(value * 100).toFixed(0)}%
							</text>
						);
					})}
				</svg>
				
				{/* 趋势线 */}
				<svg width="100%" height={chartHeight} style={{ position: 'absolute', top: 0, left: 0 }}>
					<path
						d={pathPoints}
						fill="none"
						stroke="var(--color-success)"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					{/* 数据点 */}
					{consensusPoints.map((point, idx) => {
						const x = (idx / (consensusPoints.length - 1 || 1)) * 100;
						const y = 100 - (point.y / maxScore) * 100;
						return (
							<circle
								key={idx}
								cx={`${x}%`}
								cy={`${y}%`}
								r="3"
								fill="var(--color-success)"
								stroke="var(--color-background)"
								strokeWidth="1"
							/>
						);
					})}
				</svg>
			</div>
			
			{/* 图例和统计 */}
			<div style={{ 
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				fontSize: 'var(--font-size-xs)',
				color: 'var(--color-text-secondary)',
				marginTop: 'var(--spacing-sm)',
				paddingTop: 'var(--spacing-sm)',
				borderTop: '1px solid var(--color-border-light)'
			}}>
				<div>
					<span style={{ color: 'var(--color-success)' }}>●</span> 共识度趋势
				</div>
				<div>
					共 {snapshots.length} 个快照
				</div>
			</div>
		</div>
	);
}



