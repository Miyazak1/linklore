'use client';

import { useEffect, useState } from 'react';
import TrendChart from './TrendChart';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('AnalysisPanel');

interface ConsensusPoint {
	messageId: string;
	content: string;
	confidence: number;
	createdAt: string;
	participants: string[];
}

interface DisagreementPoint {
	messageId1: string;
	messageId2: string;
	type: 'OPPOSITE' | 'DIFFERENT_VIEW' | 'CONTRADICTION';
	severity: number;
	reason: string;
	createdAt: string;
}

interface TrendDataPoint {
	timestamp: string;
	score: number;
	count: number;
}

interface AnalysisData {
	consensusPoints: ConsensusPoint[];
	consensusScore: number;
	consensusTrend: TrendDataPoint[];
	disagreementPoints: DisagreementPoint[];
	divergenceScore: number;
	divergenceTrend: TrendDataPoint[];
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
	lastAnalyzedAt?: string;
}

interface AnalysisPanelProps {
	roomId: string;
}

export default function AnalysisPanel({ roomId }: AnalysisPanelProps) {
	const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const loadAnalysis = async () => {
			try {
				setLoading(true);
				setError(null);
				const res = await fetch(`/api/chat/rooms/${roomId}/analysis`);
				if (res.ok) {
					const data = await res.json();
					setAnalysis(data.analysis);
				} else {
					const errorData = await res.json().catch(() => ({}));
					setError(errorData.error || '加载分析数据失败');
				}
			} catch (err: any) {
				log.error('Failed to load analysis', err as Error);
				setError(err.message || '加载分析数据失败');
			} finally {
				setLoading(false);
			}
		};

		loadAnalysis();

		// 每30秒自动刷新一次
		const interval = setInterval(loadAnalysis, 30000);
		return () => clearInterval(interval);
	}, [roomId]);

	if (loading) {
		return (
			<div
				style={{
					paddingTop: '12px',
					paddingBottom: '12px',
					paddingLeft: '16px',
					paddingRight: '16px',
					marginTop: 0,
					marginBottom: '12px',
					background: 'var(--color-background-paper)',
					borderRadius: '8px',
					border: '1px solid var(--color-border)'
				}}
			>
				<div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
					分析中...
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div
				style={{
					paddingTop: '12px',
					paddingBottom: '12px',
					paddingLeft: '16px',
					paddingRight: '16px',
					marginTop: 0,
					marginBottom: '12px',
					background: 'var(--color-background-paper)',
					borderRadius: '8px',
					border: '1px solid var(--color-error)'
				}}
			>
				<div style={{ color: 'var(--color-error)', fontSize: '13px' }}>错误：{error}</div>
			</div>
		);
	}

	if (!analysis) {
		return null;
	}

	return (
		<div
			style={{
				paddingTop: '12px',
				paddingBottom: '12px',
				paddingLeft: '16px',
				paddingRight: '16px',
				marginTop: 0, // 移除顶部间距，与上方更紧凑
				marginBottom: '12px',
				background: 'var(--color-background-paper)',
				borderRadius: '8px',
				border: '1px solid var(--color-border)'
			}}
		>
			<h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
				讨论分析
			</h3>

			{/* 核心指标 - 只保留共识度 */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
					gap: '12px',
					marginBottom: '16px'
				}}
			>
				<div
					style={{
						paddingTop: '12px',
						paddingBottom: '12px',
						paddingLeft: '12px',
						paddingRight: '12px',
						background: 'var(--color-background)',
						borderRadius: '6px',
						border: '1px solid var(--color-border)'
					}}
				>
					<div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
						共识度
					</div>
					<div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-success)' }}>
						{((analysis.consensusScore || 0) * 100).toFixed(1)}%
					</div>
				</div>
			</div>

			{/* 共识趋势图表 */}
			{analysis.consensusTrend && analysis.consensusTrend.length > 0 && (
				<div style={{ marginBottom: 0 }}>
					<TrendChart
						consensusTrend={analysis.consensusTrend || []}
						divergenceTrend={[]} // 不显示分歧趋势
					/>
				</div>
			)}
		</div>
	);
}
