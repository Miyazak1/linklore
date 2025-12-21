'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CitationRenderer from '@/components/trace/CitationRenderer';

interface EntryDetail {
	id: string;
	title: string;
	slug: string;
	traceType: string;
	content: string;
	citations: any[];
	version: number;
	needsUpdate: boolean;
	createdAt: string;
	updatedAt: string;
	lastReviewedAt: string | null;
	sourceTrace: {
		id: string;
		title: string;
		editor: {
			id: string;
			email: string;
			name: string | null;
		};
	};
}

const typeLabels: Record<string, string> = {
	CONCEPT: '概念',
	EVENT: '事件',
	FACT: '事实',
	PERSON: '人物',
	THEORY: '理论',
	DEFINITION: '定义'
};

interface Props {
	slug: string;
}

export default function EntryDetail({ slug }: Props) {
	const [entry, setEntry] = useState<EntryDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadEntry();
	}, [slug]);

	const loadEntry = async () => {
		try {
			setLoading(true);
			setError(null);

			const res = await fetch(`/api/entries/${slug}`);
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error?.message || '加载失败');
			}

			if (data.success) {
				setEntry(data.data);
			} else {
				throw new Error(data.error?.message || '加载失败');
			}
		} catch (err: any) {
			setError(err.message || '加载词条详情失败');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
				<div>加载中...</div>
			</div>
		);
	}

	if (error || !entry) {
		return (
			<div style={{ padding: 'var(--spacing-xl)' }}>
				<div className="card-academic" style={{ padding: 'var(--spacing-lg)' }}>
					<h2 style={{ marginBottom: 'var(--spacing-md)' }}>错误</h2>
					<p style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }}>
						{error || '词条不存在'}
					</p>
					<Link href="/entries">返回列表</Link>
				</div>
			</div>
		);
	}

	return (
		<div style={{ padding: 'var(--spacing-xl)', maxWidth: 1400, margin: '0 auto' }}>
			<div style={{ marginBottom: 'var(--spacing-lg)' }}>
				<Link href="/entries" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: 'var(--font-size-sm)' }}>
					← 返回列表
				</Link>
				<h1 style={{ marginTop: 'var(--spacing-sm)' }}>{entry.title}</h1>
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
						{typeLabels[entry.traceType] || entry.traceType}
					</span>
					{entry.needsUpdate && (
						<span
							style={{
								padding: '4px 8px',
								borderRadius: 'var(--radius-sm)',
								fontSize: 'var(--font-size-xs)',
								background: 'var(--color-warning)',
								color: '#fff'
							}}
						>
							需要更新
						</span>
					)}
					<span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
						版本 {entry.version}
					</span>
				</div>
			</div>

			<div className="card-academic" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
				<h2 style={{ marginBottom: 'var(--spacing-md)' }}>内容</h2>
				<div
					style={{
						color: 'var(--color-text-primary)',
						lineHeight: 1.8,
						whiteSpace: 'pre-wrap'
					}}
				>
					<CitationRenderer
						body={entry.content}
						citations={entry.citations.map((c: any, idx: number) => ({
							id: c.id || `citation-${idx}`,
							order: c.order || idx + 1,
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
					/>
				</div>
			</div>

			{entry.citations && Array.isArray(entry.citations) && entry.citations.length > 0 && (
				<div className="card-academic" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
					<h2 style={{ marginBottom: 'var(--spacing-md)' }}>引用 ({entry.citations.length})</h2>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
						{entry.citations.map((citation: any, index: number) => (
							<div
								key={citation.id || index}
								id={`citation-${citation.id || index}`}
								style={{
									padding: 'var(--spacing-md)',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									background: 'var(--color-background-subtle)'
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
										{citation.order || index + 1}
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

			<div className="card-academic" style={{ padding: 'var(--spacing-lg)' }}>
				<h3 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-md)' }}>来源信息</h3>
				<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
					<p style={{ margin: 'var(--spacing-xs) 0' }}>
						<strong>来源溯源：</strong>
						{/* 暂时禁用语义溯源功能，后期改造后再启用 */}
						{/* <Link href={`/traces/${entry.sourceTrace.id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
							{entry.sourceTrace.title}
						</Link> */}
						<span style={{ color: 'var(--color-text-secondary)' }}>
							{entry.sourceTrace.title}（功能暂时禁用）
						</span>
					</p>
					<p style={{ margin: 'var(--spacing-xs) 0' }}>
						<strong>编辑：</strong>
						{entry.sourceTrace.editor.name || entry.sourceTrace.editor.email}
					</p>
					<p style={{ margin: 'var(--spacing-xs) 0' }}>
						<strong>创建时间：</strong>
						{new Date(entry.createdAt).toLocaleString('zh-CN')}
					</p>
					{entry.lastReviewedAt && (
						<p style={{ margin: 'var(--spacing-xs) 0' }}>
							<strong>最后审核：</strong>
							{new Date(entry.lastReviewedAt).toLocaleString('zh-CN')}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

