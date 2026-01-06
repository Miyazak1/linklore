'use client';

import Link from 'next/link';
import { ChevronLeftIcon } from '@/components/ui/Icons';

export default function BackToDiscussionButton() {
	return (
		<Link
			href="/discussion"
			style={{
				position: 'absolute',
				top: 'var(--spacing-xl)',
				right: 'var(--spacing-xl)',
				display: 'flex',
				alignItems: 'center',
				gap: '6px',
				padding: '8px 16px',
				background: 'var(--color-background-secondary)',
				color: 'var(--color-text-secondary)',
				border: '1px solid var(--color-border)',
				borderRadius: 'var(--radius-md)',
				fontSize: '13px',
				fontWeight: 500,
				cursor: 'pointer',
				transition: 'all var(--transition-fast)',
				textDecoration: 'none'
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.borderColor = 'var(--color-primary)';
				e.currentTarget.style.color = 'var(--color-primary)';
				e.currentTarget.style.background = 'var(--color-primary-lighter)';
				e.currentTarget.style.transform = 'translateX(-2px)';
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.borderColor = 'var(--color-border)';
				e.currentTarget.style.color = 'var(--color-text-secondary)';
				e.currentTarget.style.background = 'var(--color-background-secondary)';
				e.currentTarget.style.transform = 'translateX(0)';
			}}
		>
			<ChevronLeftIcon 
				size={16} 
				color="currentColor"
				style={{ flexShrink: 0 }}
			/>
			<span>返回讨论版</span>
		</Link>
	);
}

