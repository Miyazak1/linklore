'use client';
export default function ResponseTemplate() {
	const template = `# 回应标题

## 观点（结论与立场）
- 主要观点：
- 适用范围与前提：

## 证据与引用
- 证据1（出处）：
- 证据2（出处）：

## 钢人化对立观点
- 对立观点最强版本：
- 我对其回应：

## 局限与未解决问题
- 已知局限：
- 待验证问题：
`;
	const copy = async () => {
		await navigator.clipboard.writeText(template);
		alert('已复制回应模板到剪贴板');
	};
	return (
		<div style={{ 
			border: '2px dashed var(--color-border)',
			borderRadius: 'var(--radius-md)',
			padding: 'var(--spacing-lg)',
			marginTop: 'var(--spacing-xl)',
			background: 'var(--color-background-subtle)',
			transition: 'all var(--transition-fast)'
		}}
		onMouseEnter={(e) => {
			e.currentTarget.style.borderColor = 'var(--color-primary)';
			e.currentTarget.style.background = 'var(--color-primary-lighter)';
		}}
		onMouseLeave={(e) => {
			e.currentTarget.style.borderColor = 'var(--color-border)';
			e.currentTarget.style.background = 'var(--color-background-subtle)';
		}}
		>
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				marginBottom: 'var(--spacing-md)',
				flexWrap: 'wrap',
				gap: 'var(--spacing-sm)'
			}}>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-sm)'
				}}>
					<span style={{ fontSize: '20px' }}>📋</span>
					<p style={{ 
						margin: 0,
						fontSize: 'var(--font-size-base)',
						fontWeight: 500,
						color: 'var(--color-text-primary)'
					}}>建议使用以下结构化模板撰写回应（Markdown）</p>
				</div>
				<button 
					onClick={copy}
					className="btn-academic"
					style={{
						padding: 'var(--spacing-sm) var(--spacing-md)',
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500,
						borderRadius: 'var(--radius-md)',
						cursor: 'pointer',
						transition: 'all var(--transition-fast)',
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-xs)'
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.transform = 'translateY(-1px)';
						e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = 'translateY(0)';
						e.currentTarget.style.boxShadow = 'none';
					}}
				>
					<span>📋</span>
					复制模板
				</button>
			</div>
			<pre style={{ 
				whiteSpace: 'pre-wrap',
				background: 'var(--color-background-paper)',
				padding: 'var(--spacing-md)',
				borderRadius: 'var(--radius-sm)',
				border: '1px solid var(--color-border)',
				fontSize: 'var(--font-size-sm)',
				lineHeight: 'var(--line-height-relaxed)',
				color: 'var(--color-text-primary)',
				overflowX: 'auto',
				margin: 0
			}}>{template}</pre>
		</div>
	);
}











