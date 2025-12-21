'use client';
import { useEffect, useState } from 'react';

type QualityMetrics = {
	rigor: number | null; // 严谨度
	clarity: number | null; // 清晰度
	citation: number | null; // 引用完整度
	originality: number | null; // 原创性
};

export default function QualityBadges({ topicId }: { topicId: string }) {
	const [metrics, setMetrics] = useState<QualityMetrics>({
		rigor: null,
		clarity: null,
		citation: null,
		originality: null
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch(`/api/topics/${topicId}/quality`)
			.then((res) => res.json())
			.then((data) => {
				if (data.metrics) {
					setMetrics(data.metrics);
				}
			})
			.catch((err) => {
				console.error('Failed to load quality metrics:', err);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [topicId]);

	const getScoreLabel = (score: number | null): string => {
		if (score === null) return '未评';
		if (score >= 8) return '优秀';
		if (score >= 6) return '良好';
		if (score >= 4) return '一般';
		return '待改进';
	};


	const getScoreColor = (score: number | null): string => {
		if (score === null) return 'var(--color-text-tertiary)';
		if (score >= 8) return 'var(--color-success)';
		if (score >= 6) return 'var(--color-primary)';
		if (score >= 4) return 'var(--color-warning)';
		return 'var(--color-error)';
	};

	if (loading) {
		return (
			<div className="card-academic">
				<h3 style={{ marginTop: 0, color: 'var(--color-text-primary)' }}>质量信号</h3>
				<p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', fontStyle: 'italic' }}>加载中...</p>
			</div>
		);
	}

	return (
		<div className="card-academic">
			<h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)', color: 'var(--color-text-primary)' }}>质量信号</h3>
			<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
				<li style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border-light)' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>严谨度</span>
						<span style={{ color: getScoreColor(metrics.rigor), fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
							{metrics.rigor !== null ? `${metrics.rigor.toFixed(1)}/10` : '未评'} - {getScoreLabel(metrics.rigor)}
						</span>
					</div>
				</li>
				<li style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border-light)' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>清晰度</span>
						<span style={{ color: getScoreColor(metrics.clarity), fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
							{metrics.clarity !== null ? `${metrics.clarity.toFixed(1)}/10` : '未评'} - {getScoreLabel(metrics.clarity)}
						</span>
					</div>
				</li>
				<li style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border-light)' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>引用完整度</span>
						<span style={{ color: getScoreColor(metrics.citation), fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
							{metrics.citation !== null ? `${metrics.citation.toFixed(1)}/10` : '未评'} - {getScoreLabel(metrics.citation)}
						</span>
					</div>
				</li>
				<li style={{ padding: 'var(--spacing-sm) 0' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>原创性</span>
						<span style={{ color: getScoreColor(metrics.originality), fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
							{metrics.originality !== null ? `${metrics.originality.toFixed(1)}/10` : '未评'} - {getScoreLabel(metrics.originality)}
						</span>
					</div>
				</li>
			</ul>
		</div>
	);
}

