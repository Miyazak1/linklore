export default function NotFound() {
	return (
		<div style={{ 
			padding: 'var(--spacing-xxl)', 
			textAlign: 'center',
			maxWidth: 600,
			margin: '0 auto'
		}}>
			<h1 style={{ 
				fontSize: 'var(--font-size-3xl)',
				color: 'var(--color-error)',
				marginBottom: 'var(--spacing-lg)'
			}}>
				话题不存在
			</h1>
			<p style={{ 
				color: 'var(--color-text-secondary)',
				marginBottom: 'var(--spacing-xl)'
			}}>
				您访问的话题不存在或已被删除。
			</p>
			<a 
				href="/"
				className="btn-academic btn-academic-primary"
				style={{
					display: 'inline-block',
					padding: 'var(--spacing-sm) var(--spacing-lg)',
					textDecoration: 'none'
				}}
			>
				返回首页
			</a>
		</div>
	);
}









