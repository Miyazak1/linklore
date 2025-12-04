/**
 * 溯源列表项组件（使用React.memo优化）
 */
'use client';

import { memo } from 'react';
import Link from 'next/link';

interface Trace {
	id: string;
	title: string;
	traceType: string;
	target: string;
	status: string;
	version: number;
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

interface TraceListItemProps {
	trace: Trace;
	statusLabels: Record<string, string>;
	statusColors: Record<string, string>;
	typeLabels: Record<string, string>;
}

function TraceListItem({ trace, statusLabels, statusColors, typeLabels }: TraceListItemProps) {
	return (
		<Link
			href={`/traces/${trace.id}`}
			style={{
				display: 'block',
				padding: 'var(--spacing-md)',
				border: '1px solid var(--color-border)',
				borderRadius: 'var(--radius-md)',
				textDecoration: 'none',
				color: 'inherit',
				transition: 'all var(--transition-fast)'
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
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 'var(--spacing-md)' }}>
				<div style={{ flex: 1 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
						<h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{trace.title}</h3>
						<span
							style={{
								padding: '2px 8px',
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
								padding: '2px 8px',
								borderRadius: 'var(--radius-sm)',
								fontSize: 'var(--font-size-xs)',
								background: 'var(--color-background-subtle)',
								color: statusColors[trace.status] || 'var(--color-text-secondary)',
								fontWeight: 500
							}}
						>
							{statusLabels[trace.status] || trace.status}
						</span>
					</div>
					<p
						style={{
							margin: 0,
							color: 'var(--color-text-secondary)',
							fontSize: 'var(--font-size-sm)',
							marginBottom: 'var(--spacing-xs)'
						}}
					>
						{trace.target}
					</p>
					<div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
						<span>版本: {trace.version}</span>
						{trace.analysis && (
							<span>可信度: {(trace.analysis.credibilityScore * 100).toFixed(1)}%</span>
						)}
						{trace.entry && (
							<span style={{ color: 'var(--color-success)' }}>✓ 已采纳</span>
						)}
						<span>更新: {new Date(trace.updatedAt).toLocaleDateString('zh-CN')}</span>
					</div>
				</div>
			</div>
		</Link>
	);
}

// 使用memo优化，只在trace相关属性变化时重新渲染
export default memo(TraceListItem, (prevProps, nextProps) => {
	return (
		prevProps.trace.id === nextProps.trace.id &&
		prevProps.trace.title === nextProps.trace.title &&
		prevProps.trace.status === nextProps.trace.status &&
		prevProps.trace.version === nextProps.trace.version &&
		prevProps.trace.updatedAt === nextProps.trace.updatedAt &&
		prevProps.trace.analysis?.credibilityScore === nextProps.trace.analysis?.credibilityScore &&
		prevProps.trace.entry?.id === nextProps.trace.entry?.id
	);
});

