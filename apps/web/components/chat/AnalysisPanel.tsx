'use client';

import { useState, useEffect } from 'react';
import TrendChart from './TrendChart';

interface AnalysisData {
	consensusPoints: Array<{
		messageId: string;
		content: string;
		confidence: number;
		createdAt: string;
		participants: string[];
	}>;
	consensusScore: number;
	consensusTrend: Array<{ timestamp: string; score: number; count: number }>;
	disagreementPoints: Array<{
		messageId1: string;
		messageId2: string;
		type: string;
		severity: number;
		reason: string;
		createdAt: string;
	}>;
	divergenceScore: number;
	divergenceTrend: Array<{ timestamp: string; score: number; count: number }>;
	averageDepth: number;
	maxDepth: number;
	totalReferences: number;
	aiAdoptionRate: number;
	creatorMessageCount: number;
	participantMessageCount: number;
	creatorAiAdoptionCount: number;
	participantAiAdoptionCount: number;
	creatorAiSuggestionCount: number;
	participantAiSuggestionCount: number;
	lastAnalyzedAt: string;
}

interface AnalysisPanelProps {
	roomId: string;
}

/**
 * 讨论分析面板组件
 * 显示共识/分歧统计、趋势图表等
 */
export default function AnalysisPanel({ roomId }: AnalysisPanelProps) {
	const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'overview' | 'consensus' | 'disagreement' | 'participation'>('overview');

	useEffect(() => {
		loadAnalysis();
	}, [roomId]);

	const loadAnalysis = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/chat/rooms/${roomId}/analysis`);
			if (!res.ok) {
				throw new Error('获取分析数据失败');
			}
			const data = await res.json();
			setAnalysis(data.analysis);
		} catch (err: any) {
			console.error('[AnalysisPanel] 加载分析数据失败:', err);
			setError(err.message || '加载失败');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div
				style={{
					padding: '20px',
					textAlign: 'center',
					color: 'var(--color-text-secondary)'
				}}
			>
				加载分析数据中...
			</div>
		);
	}

	if (error) {
		return (
			<div
				style={{
					padding: '20px',
					textAlign: 'center',
					color: 'var(--color-error)'
				}}
			>
				错误: {error}
			</div>
		);
	}

	if (!analysis) {
		return (
			<div
				style={{
					padding: '20px',
					textAlign: 'center',
					color: 'var(--color-text-secondary)'
				}}
			>
				暂无分析数据
			</div>
		);
	}

	return (
		<div
			style={{
				background: 'var(--color-background-paper)',
				borderRadius: '8px',
				padding: '20px',
				marginBottom: '20px',
				border: '1px solid var(--color-border)'
			}}
		>
			<h3
				style={{
					fontSize: '18px',
					fontWeight: 600,
					marginBottom: '16px',
					color: 'var(--color-text-primary)'
				}}
			>
				讨论分析
			</h3>

			{/* 标签页 */}
			<div
				style={{
					display: 'flex',
					gap: '8px',
					marginBottom: '20px',
					borderBottom: '1px solid var(--color-border)'
				}}
			>
				{['overview', 'consensus', 'disagreement', 'participation'].map((tab) => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab as any)}
						style={{
							padding: '8px 16px',
							background: 'transparent',
							border: 'none',
							borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
							color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-secondary)',
							cursor: 'pointer',
							fontSize: '14px',
							fontWeight: activeTab === tab ? 600 : 400,
							transition: 'all 0.2s'
						}}
					>
						{tab === 'overview' ? '概览' : tab === 'consensus' ? '共识' : tab === 'disagreement' ? '分歧' : '参与度'}
					</button>
				))}
			</div>

			{/* 内容区域 */}
			{activeTab === 'overview' && (
				<div>
					{/* 核心指标 */}
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(2, 1fr)',
							gap: '16px',
							marginBottom: '20px'
						}}
					>
						<div
							style={{
								padding: '16px',
								background: 'var(--color-success-lighter)',
								borderRadius: '8px',
								border: '1px solid var(--color-success)'
							}}
						>
							<div style={{ fontSize: '12px', color: 'var(--color-success)', marginBottom: '4px' }}>
								共识度
							</div>
							<div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-success)' }}>
								{(analysis.consensusScore * 100).toFixed(1)}%
							</div>
						</div>
						<div
							style={{
								padding: '16px',
								background: 'var(--color-warning-lighter)',
								borderRadius: '8px',
								border: '1px solid var(--color-warning)'
							}}
						>
							<div style={{ fontSize: '12px', color: 'var(--color-warning)', marginBottom: '4px' }}>
								分歧度
							</div>
							<div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-warning)' }}>
								{(analysis.divergenceScore * 100).toFixed(1)}%
							</div>
						</div>
					</div>

					{/* 趋势图表 */}
					<TrendChart
						consensusTrend={analysis.consensusTrend}
						divergenceTrend={analysis.divergenceTrend}
					/>
				</div>
			)}

			{activeTab === 'consensus' && (
				<div>
					<div style={{ marginBottom: '16px' }}>
						<div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
							共识点数量: {analysis.consensusPoints.length}
						</div>
						{analysis.consensusPoints.length > 0 ? (
							<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
								{analysis.consensusPoints.slice(0, 5).map((point, idx) => (
									<div
										key={idx}
										style={{
											padding: '12px',
											background: 'var(--color-background-subtle)',
											borderRadius: '6px',
											borderLeft: '3px solid var(--color-success)'
										}}
									>
										<div style={{ fontSize: '13px', marginBottom: '4px' }}>
											{point.content.substring(0, 100)}
											{point.content.length > 100 && '...'}
										</div>
										<div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
											置信度: {(point.confidence * 100).toFixed(1)}%
										</div>
									</div>
								))}
							</div>
						) : (
							<div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
								暂无共识点
							</div>
						)}
					</div>
				</div>
			)}

			{activeTab === 'disagreement' && (
				<div>
					<div style={{ marginBottom: '16px' }}>
						<div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
							分歧点数量: {analysis.disagreementPoints.length}
						</div>
						{analysis.disagreementPoints.length > 0 ? (
							<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
								{analysis.disagreementPoints.slice(0, 5).map((point, idx) => (
									<div
										key={idx}
										style={{
											padding: '12px',
											background: 'var(--color-background-subtle)',
											borderRadius: '6px',
											borderLeft: '3px solid var(--color-warning)'
										}}
									>
										<div style={{ fontSize: '13px', marginBottom: '4px' }}>
											{point.reason}
										</div>
										<div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
											严重程度: {(point.severity * 100).toFixed(1)}% | 类型: {point.type}
										</div>
									</div>
								))}
							</div>
						) : (
							<div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
								暂无分歧点
							</div>
						)}
					</div>
				</div>
			)}

			{activeTab === 'participation' && (
				<div>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(2, 1fr)',
							gap: '16px',
							marginBottom: '20px'
						}}
					>
						<div style={{ padding: '12px', background: 'var(--color-background-subtle)', borderRadius: '6px' }}>
							<div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
								创建者消息数
							</div>
							<div style={{ fontSize: '20px', fontWeight: 600 }}>
								{analysis.creatorMessageCount}
							</div>
						</div>
						<div style={{ padding: '12px', background: 'var(--color-background-subtle)', borderRadius: '6px' }}>
							<div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
								参与者消息数
							</div>
							<div style={{ fontSize: '20px', fontWeight: 600 }}>
								{analysis.participantMessageCount}
							</div>
						</div>
						<div style={{ padding: '12px', background: 'var(--color-background-subtle)', borderRadius: '6px' }}>
							<div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
								AI采纳率
							</div>
							<div style={{ fontSize: '20px', fontWeight: 600 }}>
								{(analysis.aiAdoptionRate * 100).toFixed(1)}%
							</div>
						</div>
						<div style={{ padding: '12px', background: 'var(--color-background-subtle)', borderRadius: '6px' }}>
							<div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
								引用深度
							</div>
							<div style={{ fontSize: '20px', fontWeight: 600 }}>
								{analysis.averageDepth.toFixed(1)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* 最后更新时间 */}
			<div
				style={{
					marginTop: '20px',
					paddingTop: '16px',
					borderTop: '1px solid var(--color-border)',
					fontSize: '12px',
					color: 'var(--color-text-tertiary)',
					textAlign: 'right'
				}}
			>
				最后更新: {new Date(analysis.lastAnalyzedAt).toLocaleString('zh-CN')}
			</div>
		</div>
	);
}

