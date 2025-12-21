'use client';

export default function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer style={{
			background: 'var(--color-background-paper)',
			borderTop: '1px solid var(--color-border-light)',
			padding: 'var(--spacing-lg) 0',
			marginTop: 'var(--spacing-xxl)'
		}}>
			<div style={{
				maxWidth: 1400,
				margin: '0 auto',
				padding: '0 var(--spacing-xl)',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				color: 'var(--color-text-secondary)',
				fontSize: 'var(--font-size-sm)'
			}}>
				<span>© {currentYear} Linklore. All rights reserved.</span>
			</div>
		</footer>
	);
}

