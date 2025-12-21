// 暂时禁用语义溯源功能，后期改造后再启用
// import TraceEditor from '@/components/trace/TraceEditor';

export default function NewTracePage() {
	// return <TraceEditor />;
	
	return (
		<div style={{
			maxWidth: 800,
			margin: '100px auto',
			padding: 'var(--spacing-xxl)',
			textAlign: 'center',
			background: 'var(--color-background-paper)',
			borderRadius: 'var(--radius-lg)',
			border: '1px solid var(--color-border-light)'
		}}>
			<h1 style={{
				fontSize: 'var(--font-size-2xl)',
				marginBottom: 'var(--spacing-lg)',
				color: 'var(--color-text-primary)'
			}}>功能暂时禁用</h1>
			<p style={{
				fontSize: 'var(--font-size-base)',
				color: 'var(--color-text-secondary)',
				lineHeight: 1.6
			}}>
				语义溯源功能正在改造中，敬请期待。
			</p>
		</div>
	);
}

