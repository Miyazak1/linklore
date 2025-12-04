/**
 * 词条列表项组件（使用React.memo优化）
 */
'use client';

import { memo } from 'react';
import Link from 'next/link';

interface Entry {
	id: string;
	slug: string;
	title: string;
	traceType: string;
	version: number;
	updatedAt: string;
}

interface EntryListItemProps {
	entry: Entry;
	typeLabels: Record<string, string>;
}

function EntryListItem({ entry, typeLabels }: EntryListItemProps) {
	return (
		<Link
			href={`/entries/${entry.slug}`}
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
					</div>
					<div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
						<span>版本: {entry.version}</span>
						<span>更新: {new Date(entry.updatedAt).toLocaleDateString('zh-CN')}</span>
					</div>
				</div>
			</div>
		</Link>
	);
}

// 使用memo优化
export default memo(EntryListItem, (prevProps, nextProps) => {
	return (
		prevProps.entry.id === nextProps.entry.id &&
		prevProps.entry.title === nextProps.entry.title &&
		prevProps.entry.version === nextProps.entry.version &&
		prevProps.entry.updatedAt === nextProps.entry.updatedAt
	);
});

