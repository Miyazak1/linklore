'use client';

import Card from '@/components/ui/Card';

interface FeatureCardProps {
	icon: string;
	title: string;
	description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
	return (
		<Card
			elevated
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.transform = 'translateY(-4px)';
				e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.transform = '';
				e.currentTarget.style.boxShadow = '';
			}}
		>
			<div
				style={{
					fontSize: '48px',
					marginBottom: 'var(--spacing-md)',
					lineHeight: 1,
				}}
			>
				{icon}
			</div>
			<h3
				style={{
					fontSize: 'var(--font-size-xl)',
					fontWeight: 600,
					marginBottom: 'var(--spacing-sm)',
					color: 'var(--color-text-primary)',
				}}
			>
				{title}
			</h3>
			<p
				style={{
					fontSize: 'var(--font-size-base)',
					color: 'var(--color-text-secondary)',
					lineHeight: 'var(--line-height-relaxed)',
					margin: 0,
				}}
			>
				{description}
			</p>
		</Card>
	);
}










