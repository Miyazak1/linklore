'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Entry {
	id: string;
	title: string;
	slug: string;
	traceType: string;
	version: number;
	needsUpdate: boolean;
	createdAt: string;
	updatedAt: string;
	lastReviewedAt: string | null;
}

interface PaginatedEntries {
	data: Entry[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

const typeLabels: Record<string, string> = {
	CONCEPT: '概念',
	EVENT: '事件',
	FACT: '事实',
	PERSON: '人物',
	THEORY: '理论',
	DEFINITION: '定义'
};

export default function EntryList() {
	const [entries, setEntries] = useState<PaginatedEntries | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	const [typeFilter, setTypeFilter] = useState('');
	const [page, setPage] = useState(1);

	const loadEntries = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const params = new URLSearchParams({
				page: page.toString(),
				pageSize: '20'
			});
			if (search) params.append('search', search);
			if (typeFilter) params.append('type', typeFilter);

			const res = await fetch(`/api/entries?${params}`);
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error?.message || '加载失败');
			}

			if (data.success) {
				setEntries(data.data);
			} else {
				throw new Error(data.error?.message || '加载失败');
			}
		} catch (err: any) {
			setError(err.message || '加载词条列表失败');
		} finally {
			setLoading(false);
		}
	}, [page, search, typeFilter]);

	useEffect(() => {
		loadEntries();
	}, [loadEntries]);

	if (loading && !entries) {
		return (
			<div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
				<div>加载中...</div>
			</div>
		);
	}

	if (error && !entries) {
		return (
			<div style={{ padding: 'var(--spacing-xl)' }}>
				<div className="card-academic" style={{ padding: 'var(--spacing-lg)' }}>
					<h2 style={{ marginBottom: 'var(--spacing-md)' }}>错误</h2>
					<p style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }}>
						{error}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div style={{ padding: 'var(--spacing-xl)', maxWidth: 1400, margin: '0 auto' }}>
			<h1 style={{ marginBottom: 'var(--spacing-lg)' }}>词条</h1>

			<div className="card-academic" style={{ padding: 'var(--spacing-lg)' }}>
				{/* 搜索和筛选 */}
				<div
					style={{
						display: 'flex',
						gap: 'var(--spacing-md)',
						marginBottom: 'var(--spacing-lg)',
						flexWrap: 'wrap'
					}}
				>
					<input
						type="text"
						placeholder="搜索词条..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						style={{
							flex: 1,
							minWidth: '200px',
							padding: '8px 12px',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-md)',
							fontSize: 'var(--font-size-base)'
						}}
					/>
					<select
						value={typeFilter}
						onChange={(e) => {
							setTypeFilter(e.target.value);
							setPage(1);
						}}
						style={{
							padding: '8px 12px',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-md)',
							fontSize: 'var(--font-size-base)',
							background: 'var(--color-background-paper)'
						}}
					>
						<option value="">所有类型</option>
						<option value="CONCEPT">概念</option>
						<option value="EVENT">事件</option>
						<option value="FACT">事实</option>
						<option value="PERSON">人物</option>
						<option value="THEORY">理论</option>
						<option value="DEFINITION">定义</option>
					</select>
				</div>

				{/* 词条列表 */}
				{entries && entries.data.length > 0 ? (
					<>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
							{entries.data.map((entry) => {
								return (
								<Link
									key={entry.id}
									href={`/entries/${entry.slug}`}
									style={{
										display: 'block',
										padding: 'var(--spacing-md)',
										border: '1px solid var(--color-border)',
										borderRadius: 'var(--radius-md)',
										textDecoration: 'none',
										color: 'inherit',
										transition: 'all var(--transition-fast)',
										cursor: 'pointer',
										position: 'relative',
										zIndex: 10,
										background: 'var(--color-background-paper)',
										pointerEvents: 'auto'
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.borderColor = 'var(--color-primary)';
										e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.borderColor = 'var(--color-border)';
										e.currentTarget.style.boxShadow = 'none';
									}}
								>
									<div 
										style={{ 
											display: 'flex', 
											justifyContent: 'space-between', 
											alignItems: 'start', 
											gap: 'var(--spacing-md)',
											pointerEvents: 'none'
										}}
									>
										<div style={{ flex: 1 }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
												<h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{entry.title}</h3>
												<span
													style={{
														padding: '2px 8px',
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
															padding: '2px 8px',
															borderRadius: 'var(--radius-sm)',
															fontSize: 'var(--font-size-xs)',
															background: 'var(--color-warning)',
															color: '#fff'
														}}
													>
														需要更新
													</span>
												)}
											</div>
											<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
												<span>版本: {entry.version}</span>
												<span style={{ marginLeft: 'var(--spacing-md)' }}>
													创建: {new Date(entry.createdAt).toLocaleDateString('zh-CN')}
												</span>
											</div>
										</div>
									</div>
								</Link>
								);
							})}
						</div>

						{/* 分页 */}
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginTop: 'var(--spacing-lg)',
								paddingTop: 'var(--spacing-md)',
								borderTop: '1px solid var(--color-border)'
							}}
						>
							<div style={{ color: 'var(--color-text-secondary)' }}>
								共 {entries.total} 个词条，第 {entries.page} / {entries.totalPages} 页
							</div>
							<div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
								<button
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={!entries.hasPrev}
									style={{
										padding: '6px 12px',
										border: '1px solid var(--color-border)',
										borderRadius: 'var(--radius-sm)',
										background: 'var(--color-background-paper)',
										cursor: entries.hasPrev ? 'pointer' : 'not-allowed',
										opacity: entries.hasPrev ? 1 : 0.6
									}}
								>
									上一页
								</button>
								<button
									onClick={() => setPage((p) => p + 1)}
									disabled={!entries.hasNext}
									style={{
										padding: '6px 12px',
										border: '1px solid var(--color-border)',
										borderRadius: 'var(--radius-sm)',
										background: 'var(--color-background-paper)',
										cursor: entries.hasNext ? 'pointer' : 'not-allowed',
										opacity: entries.hasNext ? 1 : 0.6
									}}
								>
									下一页
								</button>
							</div>
						</div>
					</>
				) : (
					<div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
						暂无词条
					</div>
				)}
			</div>
		</div>
	);
}

