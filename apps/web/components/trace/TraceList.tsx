'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import TraceListItem from './TraceListItem';

interface Trace {
	id: string;
	title: string;
	traceType: string;
	target: string;
	status: string;
	version: number;
	publishedAt: string | null;
	analyzedAt: string | null;
	approvedAt: string | null;
	createdAt: string;
	updatedAt: string;
	analysis: {
		credibilityScore: number;
		canApprove: boolean;
	} | null;
	entry: {
		id: string;
		slug: string;
		title: string;
	} | null;
}

interface PaginatedTraces {
	data: Trace[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
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

export default function TraceList() {
	const [traces, setTraces] = useState<PaginatedTraces | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [typeFilter, setTypeFilter] = useState('');
	const [page, setPage] = useState(1);

	// 使用useMemo缓存常量对象，避免每次渲染都创建新对象
	const statusLabelsMemo = useMemo(() => statusLabels, []);
	const statusColorsMemo = useMemo(() => statusColors, []);
	const typeLabelsMemo = useMemo(() => typeLabels, []);

	const loadTraces = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const params = new URLSearchParams({
				page: page.toString(),
				pageSize: '20'
			});
			if (search) params.append('search', search);
			if (statusFilter) params.append('status', statusFilter);
			if (typeFilter) params.append('type', typeFilter);

			const res = await fetch(`/api/traces?${params}`);
			
			if (!res.ok) {
				if (res.status === 401 || res.status === 403) {
					setError('需要编辑权限');
					return;
				}
				// 尝试解析错误响应
				let errorMessage = '加载失败';
				try {
					const errorData = await res.json();
					errorMessage = errorData.error?.message || errorMessage;
				} catch {
					// 如果响应不是 JSON，使用状态文本
					errorMessage = res.statusText || errorMessage;
				}
				throw new Error(errorMessage);
			}

			const data = await res.json();

			if (data.success) {
				setTraces(data.data);
			} else {
				throw new Error(data.error?.message || '加载失败');
			}
		} catch (err: any) {
			setError(err.message || '加载溯源列表失败');
		} finally {
			setLoading(false);
		}
	}, [page, search, statusFilter, typeFilter]);

	useEffect(() => {
		loadTraces();
	}, [loadTraces]);

	if (loading && !traces) {
		return (
			<div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
				<div>加载中...</div>
			</div>
		);
	}

	if (error && !traces) {
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
		<div style={{ padding: 'var(--spacing-xl)', maxWidth: '1200px', margin: '0 auto' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
				<h1>我的溯源</h1>
				<Link href="/traces/new">
					<Button variant="primary">创建溯源</Button>
				</Link>
			</div>

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
						placeholder="搜索标题或目标..."
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
						value={statusFilter}
						onChange={(e) => {
							setStatusFilter(e.target.value);
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
						<option value="">所有状态</option>
						<option value="DRAFT">草稿</option>
						<option value="PUBLISHED">已发布</option>
						<option value="ANALYZING">分析中</option>
						<option value="APPROVED">已采纳</option>
					</select>
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

				{/* 溯源列表 */}
				{traces && traces.data.length > 0 ? (
					<>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
							{traces.data.map((trace) => (
								<TraceListItem
									key={trace.id}
									trace={trace}
									statusLabels={statusLabelsMemo}
									statusColors={statusColorsMemo}
									typeLabels={typeLabelsMemo}
								/>
							))}
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
								共 {traces.total} 个溯源，第 {traces.page} / {traces.totalPages} 页
							</div>
							<div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
								<Button
									variant="secondary"
									size="sm"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={!traces.hasPrev}
								>
									上一页
								</Button>
								<Button
									variant="secondary"
									size="sm"
									onClick={() => setPage((p) => p + 1)}
									disabled={!traces.hasNext}
								>
									下一页
								</Button>
							</div>
						</div>
					</>
				) : (
					<div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
						暂无溯源
						{!search && !statusFilter && !typeFilter && (
							<div style={{ marginTop: 'var(--spacing-md)' }}>
								<Link href="/traces/new">
									<Button variant="primary">创建第一个溯源</Button>
								</Link>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

