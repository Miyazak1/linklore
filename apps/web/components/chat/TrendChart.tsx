'use client';

interface TrendDataPoint {
	timestamp: string;
	score: number;
	count: number;
}

interface TrendChartProps {
	consensusTrend: TrendDataPoint[];
	divergenceTrend: TrendDataPoint[];
}

/**
 * 趋势图表组件
 * 使用简单的SVG绘制折线图
 */
export default function TrendChart({ consensusTrend, divergenceTrend }: TrendChartProps) {
	const width = 600;
	const height = 200;
	const padding = { top: 20, right: 20, bottom: 30, left: 40 };

	// 合并时间点（只使用共识度数据，如果分歧度为空）
	const allTimestamps = new Set<string>();
	consensusTrend.forEach((p) => allTimestamps.add(p.timestamp));
	if (divergenceTrend.length > 0) {
		divergenceTrend.forEach((p) => allTimestamps.add(p.timestamp));
	}
	const sortedTimestamps = Array.from(allTimestamps).sort();

	// 创建数据映射
	const consensusMap = new Map(consensusTrend.map((p) => [p.timestamp, p.score]));
	const divergenceMap = divergenceTrend.length > 0 
		? new Map(divergenceTrend.map((p) => [p.timestamp, p.score]))
		: new Map<string, number>();

	// 计算Y轴范围（只使用共识度数据，如果分歧度为空）
	const allScores = consensusTrend.map((p) => p.score);
	if (divergenceTrend.length > 0) {
		allScores.push(...divergenceTrend.map((p) => p.score));
	}
	const minScore = allScores.length > 0 ? Math.min(...allScores, 0) : 0;
	const maxScore = allScores.length > 0 ? Math.max(...allScores, 1) : 1;

	// 坐标转换函数
	const xScale = (index: number) =>
		padding.left + (index / (sortedTimestamps.length - 1 || 1)) * (width - padding.left - padding.right);
	const yScale = (score: number) =>
		height -
		padding.bottom -
		((score - minScore) / (maxScore - minScore || 1)) * (height - padding.top - padding.bottom);

	// 生成路径
	const generatePath = (data: TrendDataPoint[], map: Map<string, number>) => {
		if (sortedTimestamps.length === 0) return '';

		const points = sortedTimestamps
			.map((ts, idx) => {
				const score = map.get(ts) || 0;
				return `${xScale(idx)},${yScale(score)}`;
			})
			.join(' ');

		return `M ${points}`;
	};

	const consensusPath = generatePath(consensusTrend, consensusMap);
	const divergencePath = generatePath(divergenceTrend, divergenceMap);

	return (
		<div style={{ marginTop: 0 }}>
			<div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--color-text-primary)' }}>
				共识趋势
			</div>
			<svg
				width={width}
				height={height}
				style={{
					border: '1px solid var(--color-border)',
					borderRadius: '4px',
					background: 'var(--color-background)'
				}}
			>
				{/* Y轴标签 */}
				{Array.from({ length: 5 }, (_, i) => {
					const value = minScore + ((maxScore - minScore) * i) / 4;
					const y = yScale(value);
					return (
						<g key={i}>
							<line
								x1={padding.left}
								y1={y}
								x2={width - padding.right}
								y2={y}
								stroke="var(--color-border)"
								strokeWidth="1"
								strokeDasharray="2,2"
							/>
							<text
								x={padding.left - 8}
								y={y + 4}
								fontSize="10"
								fill="var(--color-text-secondary)"
								textAnchor="end"
							>
								{(value * 100).toFixed(0)}%
							</text>
						</g>
					);
				})}

				{/* X轴标签 */}
				{sortedTimestamps.length > 0 && (
					<>
						{sortedTimestamps.map((ts, idx) => {
							if (idx % Math.ceil(sortedTimestamps.length / 5) !== 0) return null;
							const date = new Date(ts);
							return (
								<text
									key={idx}
									x={xScale(idx)}
									y={height - padding.bottom + 15}
									fontSize="10"
									fill="var(--color-text-secondary)"
									textAnchor="middle"
								>
									{date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
								</text>
							);
						})}
					</>
				)}

				{/* 共识趋势线 */}
				{consensusPath && (
					<path
						d={consensusPath}
						fill="none"
						stroke="var(--color-success)"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				)}

				{/* 分歧趋势线（只在有分歧度数据时显示） */}
				{divergenceTrend.length > 0 && divergencePath && (
					<path
						d={divergencePath}
						fill="none"
						stroke="var(--color-warning)"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				)}

				{/* 图例 */}
				<g>
					<line
						x1={width - padding.right - 100}
						y1={padding.top + 10}
						x2={width - padding.right - 80}
						y2={padding.top + 10}
						stroke="var(--color-success)"
						strokeWidth="2"
					/>
					<text
						x={width - padding.right - 75}
						y={padding.top + 13}
						fontSize="11"
						fill="var(--color-text-primary)"
					>
						共识度
					</text>
					{/* 只在有分歧度数据时显示分歧度图例 */}
					{divergenceTrend.length > 0 && (
						<>
							<line
								x1={width - padding.right - 100}
								y1={padding.top + 25}
								x2={width - padding.right - 80}
								y2={padding.top + 25}
								stroke="var(--color-warning)"
								strokeWidth="2"
							/>
							<text
								x={width - padding.right - 75}
								y={padding.top + 28}
								fontSize="11"
								fill="var(--color-text-primary)"
							>
								分歧度
							</text>
						</>
					)}
				</g>
			</svg>
		</div>
	);
}

