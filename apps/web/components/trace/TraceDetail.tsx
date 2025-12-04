'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import CitationRenderer from './CitationRenderer';

interface TraceDetail {
	id: string;
	title: string;
	traceType: string;
	target: string;
	body: string;
	status: string;
	version: number;
	publishedAt: string | null;
	analyzedAt: string | null;
	approvedAt: string | null;
	createdAt: string;
	updatedAt: string;
	editor: {
		id: string;
		email: string;
		name: string | null;
	};
	analysis: {
		credibilityScore: number;
		completenessScore: number | null;
		accuracyScore: number | null;
		sourceQualityScore: number | null;
		strengths: string[];
		weaknesses: string[];
		missingAspects: string[];
		suggestions: string[];
		canApprove: boolean;
		analysis: any;
	} | null;
	citationsList: Array<{
		id: string;
		url: string | null;
		title: string;
		author: string | null;
		publisher: string | null;
		year: number | null;
		type: string;
		quote: string | null;
		page: string | null;
		order: number;
	}>;
	entry: {
		id: string;
		slug: string;
		title: string;
	} | null;
}

const statusLabels: Record<string, string> = {
	DRAFT: '草稿',
	PUBLISHED: '已发布',
	ANALYZING: '分析中',
	APPROVED: '已采纳'
};

const statusColors: Record<string, string> = {
	DRAFT: 'var(--color-text-secondary)',
	PUBLISHED: 'var(--color-primary)',
	ANALYZING: 'var(--color-warning)',
	APPROVED: 'var(--color-success)'
};

const typeLabels: Record<string, string> = {
	CONCEPT: '概念',
	EVENT: '事件',
	FACT: '事实',
	PERSON: '人物',
	THEORY: '理论',
	DEFINITION: '定义'
};

interface Props {
	traceId: string;
}

export default function TraceDetail({ traceId }: Props) {
	const router = useRouter();
	const [trace, setTrace] = useState<TraceDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [publishing, setPublishing] = useState(false);
	const [approving, setApproving] = useState(false);
	const [hoveredCitationId, setHoveredCitationId] = useState<string | null>(null);

	useEffect(() => {
		loadTrace();
	}, [traceId]);

	const loadTrace = async () => {
		try {
			setLoading(true);
			setError(null);

			const res = await fetch(`/api/traces/${traceId}`);
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error?.message || '加载失败');
			}

			if (data.success) {
				setTrace(data.data);
			} else {
				throw new Error(data.error?.message || '加载失败');
			}
		} catch (err: any) {
			setError(err.message || '加载溯源详情失败');
		} finally {
			setLoading(false);
		}
	};

	const handlePublish = async () => {
		if (!confirm('确定要发布此溯源吗？发布后将开始AI分析。')) {
			return;
		}

		try {
			setPublishing(true);
			const res = await fetch(`/api/traces/${traceId}/publish`, {
				method: 'POST'
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error?.message || '发布失败');
			}

			alert('溯源已发布，AI分析已开始');
			await loadTrace();
		} catch (err: any) {
			alert(err.message || '发布失败');
		} finally {
			setPublishing(false);
		}
	};

	const handleApprove = async () => {
		if (!confirm('确定要采纳此溯源吗？采纳后将创建词条。')) {
			return;
		}

		try {
			setApproving(true);
			const res = await fetch(`/api/traces/${traceId}/approve`, {
				method: 'POST'
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error?.message || '采纳失败');
			}

			alert('溯源已采纳，词条已创建');
			await loadTrace();
		} catch (err: any) {
			alert(err.message || '采纳失败');
		} finally {
			setApproving(false);
		}
	};

	if (loading) {
		return (
			<div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
				<div>加载中...</div>
			</div>
		);
	}

	if (error || !trace) {
		return (
			<div style={{ padding: 'var(--spacing-xl)' }}>
				<div className="card-academic" style={{ padding: 'var(--spacing-lg)' }}>
					<h2 style={{ marginBottom: 'var(--spacing-md)' }}>错误</h2>
					<p style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }}>
						{error || '溯源不存在'}
					</p>
					<Button onClick={() => router.push('/traces')}>返回列表</Button>
				</div>
			</div>
		);
	}

	return (
		<div style={{ padding: 'var(--spacing-xl)', maxWidth: '1200px', margin: '0 auto' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-lg)' }}>
				<div>
					<Link href="/traces" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: 'var(--font-size-sm)' }}>
						← 返回列表
					</Link>
					<h1 style={{ marginTop: 'var(--spacing-sm)' }}>{trace.title}</h1>
					<div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', marginTop: 'var(--spacing-xs)' }}>
						<span
							style={{
								padding: '4px 8px',
								borderRadius: 'var(--radius-sm)',
								fontSize: 'var(--font-size-xs)',
								background: 'var(--color-background-subtle)',
								color: 'var(--color-text-secondary)'
							}}
						>
							{typeLabels[trace.traceType] || trace.traceType}
						</span>
						<span
							style={{
								padding: '4px 8px',
								borderRadius: 'var(--radius-sm)',
								fontSize: 'var(--font-size-xs)',
								background: 'var(--color-background-subtle)',
								color: statusColors[trace.status] || 'var(--color-text-secondary)',
								fontWeight: 500
							}}
						>
							{statusLabels[trace.status] || trace.status}
						</span>
						{trace.entry && (
							<Link href={`/entries/${trace.entry.slug}`}>
								<span
									style={{
										padding: '4px 8px',
										borderRadius: 'var(--radius-sm)',
										fontSize: 'var(--font-size-xs)',
										background: 'var(--color-success)',
										color: '#fff',
										textDecoration: 'none'
									}}
								>
									查看词条
								</span>
							</Link>
						)}
					</div>
				</div>
				<div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
					{trace.status === 'DRAFT' && (
						<>
							<Link href={`/traces/${traceId}/edit`}>
								<Button variant="secondary">编辑</Button>
							</Link>
							<Button variant="primary" onClick={handlePublish} disabled={publishing}>
								{publishing ? '发布中...' : '发布'}
							</Button>
						</>
					)}
					{trace.status === 'PUBLISHED' && trace.analysis?.canApprove && (
						<Button variant="success" onClick={handleApprove} disabled={approving}>
							{approving ? '采纳中...' : '采纳'}
						</Button>
					)}
				</div>
			</div>

			<div className="card-academic" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
				<h2 style={{ marginBottom: 'var(--spacing-md)' }}>溯源目标</h2>
				<p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{trace.target}</p>
			</div>

			<div className="card-academic" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
				<h2 style={{ marginBottom: 'var(--spacing-md)' }}>正文</h2>
				<div
					style={{
						color: 'var(--color-text-primary)',
						lineHeight: 1.8,
						whiteSpace: 'pre-wrap'
					}}
				>
					<CitationRenderer
						body={trace.body}
						citations={trace.citationsList.map((c) => ({
							id: c.id,
							order: c.order,
							title: c.title,
							url: c.url
						}))}
						onCitationClick={(citationId, order) => {
							// 滚动到对应的引用
							const citationElement = document.getElementById(`citation-${citationId}`);
							if (citationElement) {
								citationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
								// 高亮效果
								citationElement.style.background = 'var(--color-warning)';
								setTimeout(() => {
									citationElement.style.background = 'var(--color-background-subtle)';
								}, 2000);
							}
						}}
						onCitationHover={(citationId) => {
							setHoveredCitationId(citationId);
						}}
					/>
				</div>
			</div>

			{trace.citationsList && trace.citationsList.length > 0 && (
				<div className="card-academic" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
					<h2 style={{ marginBottom: 'var(--spacing-md)' }}>引用 ({trace.citationsList.length})</h2>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
						{trace.citationsList.map((citation) => (
							<div
								id={`citation-${citation.id}`}
								key={citation.id}
								style={{
									padding: 'var(--spacing-md)',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									background: hoveredCitationId === citation.id
										? 'rgba(33, 150, 243, 0.08)'
										: 'var(--color-background-subtle)',
									borderColor: hoveredCitationId === citation.id
										? 'rgba(33, 150, 243, 0.3)'
										: 'var(--color-border)',
									transition: 'all var(--transition-fast)',
									boxShadow: hoveredCitationId === citation.id
										? '0 2px 4px rgba(33, 150, 243, 0.1)'
										: 'none'
								}}
							>
								<div style={{ display: 'flex', alignItems: 'start', gap: 'var(--spacing-sm)' }}>
									<span
										style={{
											display: 'inline-flex',
											alignItems: 'center',
											justifyContent: 'center',
											width: '24px',
											height: '24px',
											borderRadius: '50%',
											background: 'var(--color-primary)',
											color: '#fff',
											fontSize: 'var(--font-size-xs)',
											fontWeight: 600,
											flexShrink: 0
										}}
									>
										{citation.order}
									</span>
									<div style={{ flex: 1 }}>
										<h4 style={{ margin: 0, marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-base)' }}>
											{citation.title}
										</h4>
										<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
											{citation.author && <span>{citation.author}</span>}
											{citation.year && <span> ({citation.year})</span>}
											{citation.publisher && <span> - {citation.publisher}</span>}
										</div>
										{citation.url && (
											<a
												href={citation.url}
												target="_blank"
												rel="noopener noreferrer"
												style={{
													color: 'var(--color-primary)',
													textDecoration: 'none',
													fontSize: 'var(--font-size-sm)',
													wordBreak: 'break-all'
												}}
											>
												{citation.url}
											</a>
										)}
										{citation.quote && (
											<blockquote
												style={{
													margin: 'var(--spacing-xs) 0 0 0',
													padding: 'var(--spacing-xs) var(--spacing-sm)',
													borderLeft: '3px solid var(--color-border)',
													color: 'var(--color-text-secondary)',
													fontSize: 'var(--font-size-sm)',
													fontStyle: 'italic'
												}}
											>
												{citation.quote}
											</blockquote>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{trace.analysis && (
				<div className="card-academic" style={{ padding: 'var(--spacing-lg)' }}>
					<h2 style={{ marginBottom: 'var(--spacing-md)' }}>AI分析结果</h2>

					{/* 评分 */}
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
						<div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: 'var(--color-background-subtle)', borderRadius: 'var(--radius-md)' }}>
							<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
									可信度
							</div>
							<div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
								{(trace.analysis.credibilityScore * 100).toFixed(1)}%
							</div>
						</div>
						{trace.analysis.completenessScore !== null && (
							<div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: 'var(--color-background-subtle)', borderRadius: 'var(--radius-md)' }}>
								<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
									完整性
							</div>
								<div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
									{(trace.analysis.completenessScore * 100).toFixed(1)}%
							</div>
							</div>
						)}
						{trace.analysis.accuracyScore !== null && (
							<div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: 'var(--color-background-subtle)', borderRadius: 'var(--radius-md)' }}>
								<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
									准确性
							</div>
								<div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
									{(trace.analysis.accuracyScore * 100).toFixed(1)}%
							</div>
							</div>
						)}
						{trace.analysis.sourceQualityScore !== null && (
							<div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: 'var(--color-background-subtle)', borderRadius: 'var(--radius-md)' }}>
								<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
									来源质量
							</div>
								<div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
									{(trace.analysis.sourceQualityScore * 100).toFixed(1)}%
							</div>
							</div>
						)}
					</div>

					{/* 优点 */}
					{trace.analysis.strengths.length > 0 && (
						<div style={{ marginBottom: 'var(--spacing-md)' }}>
							<h3 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-success)' }}>
								优点
							</h3>
							<ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
								{trace.analysis.strengths.map((strength, idx) => (
									<li key={idx} style={{ marginBottom: 'var(--spacing-xs)' }}>{strength}</li>
								))}
							</ul>
						</div>
					)}

					{/* 不足 */}
					{trace.analysis.weaknesses.length > 0 && (
						<div style={{ marginBottom: 'var(--spacing-md)' }}>
							<h3 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-warning)' }}>
								不足
							</h3>
							<ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
								{trace.analysis.weaknesses.map((weakness, idx) => (
									<li key={idx} style={{ marginBottom: 'var(--spacing-xs)' }}>{weakness}</li>
								))}
							</ul>
						</div>
					)}

					{/* 缺失的方面 */}
					{trace.analysis.missingAspects.length > 0 && (
						<div style={{ marginBottom: 'var(--spacing-md)' }}>
							<h3 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
								缺失的方面
							</h3>
							<ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
								{trace.analysis.missingAspects.map((aspect, idx) => (
									<li key={idx} style={{ marginBottom: 'var(--spacing-xs)' }}>{aspect}</li>
								))}
							</ul>
						</div>
					)}

					{/* 建议 */}
					{trace.analysis.suggestions.length > 0 && (
						<div>
							<h3 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-primary)' }}>
								改进建议
							</h3>
							<ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
								{trace.analysis.suggestions.map((suggestion, idx) => (
									<li key={idx} style={{ marginBottom: 'var(--spacing-xs)' }}>{suggestion}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

