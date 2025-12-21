'use client';

export default function HeroSection() {
	return (
		<div
			style={{
				maxWidth: '1200px',
				margin: '0 auto',
				padding: 'var(--spacing-xxl) var(--spacing-md)',
				textAlign: 'center',
			}}
		>
			<h1
				style={{
					fontSize: 'var(--font-size-4xl)',
					fontWeight: 700,
					marginBottom: 'var(--spacing-lg)',
					color: 'var(--color-text-primary)',
					lineHeight: 1.2,
				}}
			>
				LinkLore
			</h1>
			<p
				style={{
					fontSize: 'var(--font-size-xl)',
					color: 'var(--color-text-secondary)',
					marginBottom: 'var(--spacing-md)',
					maxWidth: '600px',
					margin: '0 auto var(--spacing-lg)',
				}}
			>
				智能辅助的深度对话平台
			</p>
			<p
				style={{
					fontSize: 'var(--font-size-base)',
					color: 'var(--color-text-secondary)',
					maxWidth: '800px',
					margin: '0 auto',
					lineHeight: 1.6,
				}}
			>
				通过 AI 辅助和结构化讨论，帮助你深入思考复杂话题，发现新的观点和见解
			</p>
		</div>
	);
}
