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

			if (data.success && data.data) {
				const entrySlug = data.data.slug;
				alert(`溯源已采纳，词条已创建！`);
				// 重新加载溯源数据以更新状态
				await loadTrace();
				// 可选：跳转到词条页面
				// router.push(`/entries/${entrySlug}`);
			} else {
				alert('溯源已采纳，但未返回词条信息');
				await loadTrace();
			}
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
		<div style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
			{/* 头部区域 */}
			<div 
				className="card-academic" 
				style={{ 
					padding: 'var(--spacing-xl)', 
					marginBottom: 'var(--spacing-xl)',
					background: 'linear-gradient(135deg, var(--color-background-paper) 0%, var(--color-background-subtle) 100%)',
					border: '1px solid var(--color-border-light)',
					borderRadius: 'var(--radius-lg)',
					boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
				}}
			>
				<Link 
					href="/traces" 
					style={{ 
						color: 'var(--color-text-secondary)', 
						textDecoration: 'none', 
						fontSize: 'var(--font-size-sm)',
						display: 'inline-flex',
						alignItems: 'center',
						gap: 'var(--spacing-xs)',
						marginBottom: 'var(--spacing-md)',
						transition: 'color var(--transition-fast)'
					}}
					onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
					onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
				>
					← 返回列表
				</Link>
				
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 'var(--spacing-lg)' }}>
					<div style={{ flex: 1 }}>
						<h1 style={{ 
							marginTop: 0, 
							marginBottom: 'var(--spacing-md)',
							fontSize: 'var(--font-size-3xl)',
							fontWeight: 700,
							lineHeight: 1.2,
							color: 'var(--color-text-primary)'
						}}>
							{trace.title}
						</h1>
						
						{/* 标签和元数据 */}
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
							<span
								style={{
									padding: '6px 12px',
									borderRadius: 'var(--radius-md)',
									fontSize: 'var(--font-size-xs)',
									background: 'var(--color-primary-lighter)',
									color: 'var(--color-primary)',
									fontWeight: 600,
									border: '1px solid rgba(26, 68, 128, 0.1)'
								}}
							>
								{typeLabels[trace.traceType] || trace.traceType}
							</span>
							{/* 如果有 entry，只显示"✓ 已采纳"，否则显示状态标签 */}
							{trace.entry ? (
								<span
									style={{
										padding: '6px 12px',
										borderRadius: 'var(--radius-md)',
										fontSize: 'var(--font-size-xs)',
										background: 'var(--color-success)',
										color: '#fff',
										fontWeight: 600,
										display: 'inline-block'
									}}
								>
									✓ 已采纳
								</span>
							) : (
								<span
									style={{
										padding: '6px 12px',
										borderRadius: 'var(--radius-md)',
										fontSize: 'var(--font-size-xs)',
										background: statusColors[trace.status] === 'var(--color-primary)' 
											? 'rgba(26, 68, 128, 0.1)' 
											: statusColors[trace.status] === 'var(--color-success)'
											? 'rgba(45, 122, 50, 0.1)'
											: statusColors[trace.status] === 'var(--color-warning)'
											? 'rgba(184, 134, 11, 0.1)'
											: 'var(--color-background-subtle)',
										color: statusColors[trace.status] || 'var(--color-text-secondary)',
										fontWeight: 600,
										border: `1px solid ${statusColors[trace.status] || 'var(--color-border)'}`
									}}
								>
									{statusLabels[trace.status] || trace.status}
								</span>
							)}
						</div>
						
						{/* 元数据信息 */}
						<div style={{ 
							display: 'flex', 
							flexWrap: 'wrap', 
							gap: 'var(--spacing-md)', 
							fontSize: 'var(--font-size-sm)', 
							color: 'var(--color-text-secondary)',
							paddingTop: 'var(--spacing-md)',
							borderTop: '1px solid var(--color-border-light)'
						}}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
								<span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>作者:</span>
								<span>{trace.editor.name || trace.editor.email}</span>
							</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
								<span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>版本:</span>
								<span>v{trace.version}</span>
							</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
								<span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>更新:</span>
								<span>{new Date(trace.updatedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
							</div>
						</div>
					</div>
					
					{/* 操作按钮 */}
					<div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexShrink: 0 }}>
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
			</div>

			{/* 溯源目标 */}
			<div 
				className="card-academic" 
				style={{ 
					padding: 'var(--spacing-xl)', 
					marginBottom: 'var(--spacing-lg)',
					background: 'var(--color-background-paper)',
					border: '1px solid var(--color-border-light)',
					borderRadius: 'var(--radius-lg)',
					boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
					transition: 'all var(--transition-normal)'
				}}
			>
				<h2 style={{ 
					marginBottom: 'var(--spacing-md)',
					fontSize: 'var(--font-size-2xl)',
					fontWeight: 600,
					color: 'var(--color-text-primary)',
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-sm)'
				}}>
					<span style={{ 
						width: '4px', 
						height: '24px', 
						background: 'var(--color-primary)', 
						borderRadius: '2px' 
					}}></span>
					溯源目标
				</h2>
				<p style={{ 
					color: 'var(--color-text-primary)', 
					lineHeight: 1.8,
					fontSize: 'var(--font-size-base)',
					margin: 0
				}}>
					{trace.target}
				</p>
			</div>

			{/* 正文 */}
			<div 
				className="card-academic" 
				style={{ 
					padding: 'var(--spacing-xl)', 
					marginBottom: 'var(--spacing-lg)',
					background: 'var(--color-background-paper)',
					border: '1px solid var(--color-border-light)',
					borderRadius: 'var(--radius-lg)',
					boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
				}}
			>
				<h2 style={{ 
					marginBottom: 'var(--spacing-md)',
					fontSize: 'var(--font-size-2xl)',
					fontWeight: 600,
					color: 'var(--color-text-primary)',
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-sm)'
				}}>
					<span style={{ 
						width: '4px', 
						height: '24px', 
						background: 'var(--color-primary)', 
						borderRadius: '2px' 
					}}></span>
					正文
				</h2>
				<div
					style={{
						color: 'var(--color-text-primary)',
						lineHeight: 1.9,
						whiteSpace: 'pre-wrap',
						fontSize: 'var(--font-size-base)'
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
				<div 
					className="card-academic" 
					style={{ 
						padding: 'var(--spacing-xl)', 
						marginBottom: 'var(--spacing-lg)',
						background: 'var(--color-background-paper)',
						border: '1px solid var(--color-border-light)',
						borderRadius: 'var(--radius-lg)',
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
					}}
				>
					<h2 style={{ 
						marginBottom: 'var(--spacing-lg)',
						fontSize: 'var(--font-size-2xl)',
						fontWeight: 600,
						color: 'var(--color-text-primary)',
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-sm)'
					}}>
						<span style={{ 
							width: '4px', 
							height: '24px', 
							background: 'var(--color-primary)', 
							borderRadius: '2px' 
						}}></span>
						引用
						<span style={{ 
							fontSize: 'var(--font-size-base)', 
							fontWeight: 400, 
							color: 'var(--color-text-secondary)',
							marginLeft: 'var(--spacing-xs)'
						}}>
							({trace.citationsList.length})
						</span>
					</h2>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
						{trace.citationsList.map((citation) => (
							<div
								id={`citation-${citation.id}`}
								key={citation.id}
								style={{
									padding: 'var(--spacing-lg)',
									border: `1px solid ${hoveredCitationId === citation.id ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
									borderRadius: 'var(--radius-md)',
									background: hoveredCitationId === citation.id
										? 'rgba(26, 68, 128, 0.04)'
										: 'var(--color-background-subtle)',
									transition: 'all var(--transition-normal)',
									boxShadow: hoveredCitationId === citation.id
										? '0 4px 12px rgba(26, 68, 128, 0.15)'
										: '0 1px 2px rgba(0, 0, 0, 0.05)',
									cursor: 'pointer'
								}}
								onMouseEnter={() => setHoveredCitationId(citation.id)}
								onMouseLeave={() => setHoveredCitationId(null)}
							>
								<div style={{ display: 'flex', alignItems: 'start', gap: 'var(--spacing-md)' }}>
									<span
										style={{
											display: 'inline-flex',
											alignItems: 'center',
											justifyContent: 'center',
											width: '32px',
											height: '32px',
											borderRadius: '50%',
											background: hoveredCitationId === citation.id 
												? 'var(--color-primary)' 
												: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
											color: '#fff',
											fontSize: 'var(--font-size-sm)',
											fontWeight: 700,
											flexShrink: 0,
											boxShadow: '0 2px 4px rgba(26, 68, 128, 0.2)',
											transition: 'all var(--transition-normal)'
										}}
									>
										{citation.order}
									</span>
									<div style={{ flex: 1, minWidth: 0 }}>
										<h4 style={{ 
											margin: 0, 
											marginBottom: 'var(--spacing-xs)', 
											fontSize: 'var(--font-size-base)',
											fontWeight: 600,
											color: 'var(--color-text-primary)',
											lineHeight: 1.4
										}}>
											{citation.title}
										</h4>
										{(citation.author || citation.year || citation.publisher) && (
											<div style={{ 
												fontSize: 'var(--font-size-sm)', 
												color: 'var(--color-text-secondary)',
												marginBottom: 'var(--spacing-xs)'
											}}>
												{citation.author && <span style={{ fontWeight: 500 }}>{citation.author}</span>}
												{citation.year && <span> ({citation.year})</span>}
												{citation.publisher && <span> · {citation.publisher}</span>}
											</div>
										)}
										{citation.url && (
											<a
												href={citation.url}
												target="_blank"
												rel="noopener noreferrer"
												style={{
													color: 'var(--color-primary)',
													textDecoration: 'none',
													fontSize: 'var(--font-size-sm)',
													wordBreak: 'break-all',
													display: 'inline-block',
													marginTop: 'var(--spacing-xs)',
													padding: '2px 0',
													borderBottom: '1px solid transparent',
													transition: 'all var(--transition-fast)'
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.borderBottomColor = 'var(--color-primary)';
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.borderBottomColor = 'transparent';
												}}
											>
												{citation.url}
											</a>
										)}
										{citation.quote && (
											<blockquote
												style={{
													margin: 'var(--spacing-sm) 0 0 0',
													padding: 'var(--spacing-sm) var(--spacing-md)',
													borderLeft: '3px solid var(--color-primary)',
													background: 'rgba(26, 68, 128, 0.03)',
													borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
													color: 'var(--color-text-secondary)',
													fontSize: 'var(--font-size-sm)',
													fontStyle: 'italic',
													lineHeight: 1.6
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
				<div 
					className="card-academic" 
					style={{ 
						padding: 'var(--spacing-xl)',
						background: 'var(--color-background-paper)',
						border: '1px solid var(--color-border-light)',
						borderRadius: 'var(--radius-lg)',
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
					}}
				>
					<h2 style={{ 
						marginBottom: 'var(--spacing-lg)',
						fontSize: 'var(--font-size-2xl)',
						fontWeight: 600,
						color: 'var(--color-text-primary)',
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-sm)'
					}}>
						<span style={{ 
							width: '4px', 
							height: '24px', 
							background: 'var(--color-primary)', 
							borderRadius: '2px' 
						}}></span>
						AI分析结果
					</h2>

					{/* 评分 */}
					<div style={{ 
						display: 'grid', 
						gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
						gap: 'var(--spacing-md)', 
						marginBottom: 'var(--spacing-xl)'
					}}>
						<div style={{ 
							textAlign: 'center', 
							padding: 'var(--spacing-lg)', 
							background: 'linear-gradient(135deg, rgba(26, 68, 128, 0.08) 0%, rgba(26, 68, 128, 0.03) 100%)',
							border: '1px solid rgba(26, 68, 128, 0.1)',
							borderRadius: 'var(--radius-lg)',
							transition: 'all var(--transition-normal)'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.transform = 'translateY(-2px)';
							e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 68, 128, 0.15)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.transform = 'translateY(0)';
							e.currentTarget.style.boxShadow = 'none';
						}}
						>
							<div style={{ 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--color-text-secondary)', 
								marginBottom: 'var(--spacing-sm)',
								fontWeight: 600,
								textTransform: 'uppercase',
								letterSpacing: '0.05em'
							}}>
								可信度
							</div>
							<div style={{ 
								fontSize: 'var(--font-size-2xl)', 
								fontWeight: 700, 
								color: 'var(--color-primary)',
								lineHeight: 1.2
							}}>
								{(trace.analysis.credibilityScore * 100).toFixed(1)}%
							</div>
						</div>
						{trace.analysis.completenessScore !== null && (
							<div style={{ 
								textAlign: 'center', 
								padding: 'var(--spacing-lg)', 
								background: 'var(--color-background-subtle)',
								border: '1px solid var(--color-border-light)',
								borderRadius: 'var(--radius-lg)',
								transition: 'all var(--transition-normal)'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.transform = 'translateY(-2px)';
								e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.transform = 'translateY(0)';
								e.currentTarget.style.boxShadow = 'none';
							}}
							>
								<div style={{ 
									fontSize: 'var(--font-size-xs)', 
									color: 'var(--color-text-secondary)', 
									marginBottom: 'var(--spacing-sm)',
									fontWeight: 600,
									textTransform: 'uppercase',
									letterSpacing: '0.05em'
								}}>
									完整性
								</div>
								<div style={{ 
									fontSize: 'var(--font-size-2xl)', 
									fontWeight: 700,
									color: 'var(--color-text-primary)',
									lineHeight: 1.2
								}}>
									{(trace.analysis.completenessScore * 100).toFixed(1)}%
								</div>
							</div>
						)}
						{trace.analysis.accuracyScore !== null && (
							<div style={{ 
								textAlign: 'center', 
								padding: 'var(--spacing-lg)', 
								background: 'var(--color-background-subtle)',
								border: '1px solid var(--color-border-light)',
								borderRadius: 'var(--radius-lg)',
								transition: 'all var(--transition-normal)'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.transform = 'translateY(-2px)';
								e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.transform = 'translateY(0)';
								e.currentTarget.style.boxShadow = 'none';
							}}
							>
								<div style={{ 
									fontSize: 'var(--font-size-xs)', 
									color: 'var(--color-text-secondary)', 
									marginBottom: 'var(--spacing-sm)',
									fontWeight: 600,
									textTransform: 'uppercase',
									letterSpacing: '0.05em'
								}}>
									准确性
								</div>
								<div style={{ 
									fontSize: 'var(--font-size-2xl)', 
									fontWeight: 700,
									color: 'var(--color-text-primary)',
									lineHeight: 1.2
								}}>
									{(trace.analysis.accuracyScore * 100).toFixed(1)}%
								</div>
							</div>
						)}
						{trace.analysis.sourceQualityScore !== null && (
							<div style={{ 
								textAlign: 'center', 
								padding: 'var(--spacing-lg)', 
								background: 'var(--color-background-subtle)',
								border: '1px solid var(--color-border-light)',
								borderRadius: 'var(--radius-lg)',
								transition: 'all var(--transition-normal)'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.transform = 'translateY(-2px)';
								e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.transform = 'translateY(0)';
								e.currentTarget.style.boxShadow = 'none';
							}}
							>
								<div style={{ 
									fontSize: 'var(--font-size-xs)', 
									color: 'var(--color-text-secondary)', 
									marginBottom: 'var(--spacing-sm)',
									fontWeight: 600,
									textTransform: 'uppercase',
									letterSpacing: '0.05em'
								}}>
									来源质量
								</div>
								<div style={{ 
									fontSize: 'var(--font-size-2xl)', 
									fontWeight: 700,
									color: 'var(--color-text-primary)',
									lineHeight: 1.2
								}}>
									{(trace.analysis.sourceQualityScore * 100).toFixed(1)}%
								</div>
							</div>
						)}
					</div>

					{/* 优点 */}
					{trace.analysis.strengths.length > 0 && (
						<div style={{ 
							marginBottom: 'var(--spacing-lg)',
							padding: 'var(--spacing-md)',
							background: 'rgba(45, 122, 50, 0.05)',
							borderLeft: '4px solid var(--color-success)',
							borderRadius: '0 var(--radius-md) var(--radius-md) 0'
						}}>
							<h3 style={{ 
								fontSize: 'var(--font-size-lg)', 
								marginBottom: 'var(--spacing-sm)', 
								color: 'var(--color-success)',
								fontWeight: 600,
								display: 'flex',
								alignItems: 'center',
								gap: 'var(--spacing-xs)'
							}}>
								<span>✓</span>
								优点
							</h3>
							<ul style={{ 
								margin: 0, 
								paddingLeft: 'var(--spacing-lg)', 
								color: 'var(--color-text-primary)',
								lineHeight: 1.7
							}}>
								{trace.analysis.strengths.map((strength, idx) => (
									<li key={idx} style={{ marginBottom: 'var(--spacing-sm)' }}>{strength}</li>
								))}
							</ul>
						</div>
					)}

					{/* 不足 */}
					{trace.analysis.weaknesses.length > 0 && (
						<div style={{ 
							marginBottom: 'var(--spacing-lg)',
							padding: 'var(--spacing-md)',
							background: 'rgba(184, 134, 11, 0.05)',
							borderLeft: '4px solid var(--color-warning)',
							borderRadius: '0 var(--radius-md) var(--radius-md) 0'
						}}>
							<h3 style={{ 
								fontSize: 'var(--font-size-lg)', 
								marginBottom: 'var(--spacing-sm)', 
								color: 'var(--color-warning)',
								fontWeight: 600,
								display: 'flex',
								alignItems: 'center',
								gap: 'var(--spacing-xs)'
							}}>
								<span>⚠</span>
								不足
							</h3>
							<ul style={{ 
								margin: 0, 
								paddingLeft: 'var(--spacing-lg)', 
								color: 'var(--color-text-primary)',
								lineHeight: 1.7
							}}>
								{trace.analysis.weaknesses.map((weakness, idx) => (
									<li key={idx} style={{ marginBottom: 'var(--spacing-sm)' }}>{weakness}</li>
								))}
							</ul>
						</div>
					)}

					{/* 缺失的方面 */}
					{trace.analysis.missingAspects.length > 0 && (
						<div style={{ 
							marginBottom: 'var(--spacing-lg)',
							padding: 'var(--spacing-md)',
							background: 'rgba(107, 107, 107, 0.05)',
							borderLeft: '4px solid var(--color-text-secondary)',
							borderRadius: '0 var(--radius-md) var(--radius-md) 0'
						}}>
							<h3 style={{ 
								fontSize: 'var(--font-size-lg)', 
								marginBottom: 'var(--spacing-sm)', 
								color: 'var(--color-text-secondary)',
								fontWeight: 600,
								display: 'flex',
								alignItems: 'center',
								gap: 'var(--spacing-xs)'
							}}>
								<span>○</span>
								缺失的方面
							</h3>
							<ul style={{ 
								margin: 0, 
								paddingLeft: 'var(--spacing-lg)', 
								color: 'var(--color-text-primary)',
								lineHeight: 1.7
							}}>
								{trace.analysis.missingAspects.map((aspect, idx) => (
									<li key={idx} style={{ marginBottom: 'var(--spacing-sm)' }}>{aspect}</li>
								))}
							</ul>
						</div>
					)}

					{/* 建议 */}
					{trace.analysis.suggestions.length > 0 && (
						<div style={{
							padding: 'var(--spacing-md)',
							background: 'rgba(26, 68, 128, 0.05)',
							borderLeft: '4px solid var(--color-primary)',
							borderRadius: '0 var(--radius-md) var(--radius-md) 0'
						}}>
							<h3 style={{ 
								fontSize: 'var(--font-size-lg)', 
								marginBottom: 'var(--spacing-sm)', 
								color: 'var(--color-primary)',
								fontWeight: 600,
								display: 'flex',
								alignItems: 'center',
								gap: 'var(--spacing-xs)'
							}}>
								<span>💡</span>
								改进建议
							</h3>
							<ul style={{ 
								margin: 0, 
								paddingLeft: 'var(--spacing-lg)', 
								color: 'var(--color-text-primary)',
								lineHeight: 1.7
							}}>
								{trace.analysis.suggestions.map((suggestion, idx) => (
									<li key={idx} style={{ marginBottom: 'var(--spacing-sm)' }}>{suggestion}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

