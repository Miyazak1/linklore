'use client';

/**
 * 工具区组件
 * 预留区域，后续可以添加各种实用工具
 */
export default function ToolsZone() {
	return (
		<div style={{
			marginTop: 'var(--spacing-xxl)'
		}}>
			<div style={{
				marginBottom: 'var(--spacing-lg)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between'
			}}>
				<h2 style={{
					fontSize: 'var(--font-size-2xl)',
					fontWeight: 600,
					color: 'var(--color-text-primary)',
					margin: 0
				}}>
					工具区
				</h2>
			</div>

			{/* 预留内容区域 */}
			<div style={{
				padding: 'var(--spacing-xl)',
				background: 'transparent',
				borderRadius: 'var(--radius-lg)',
				border: '1px dashed var(--color-border-light)',
				textAlign: 'center',
				color: 'var(--color-text-tertiary)',
				minHeight: '200px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center'
			}}>
				<div>
					<p style={{
						fontSize: 'var(--font-size-lg)',
						margin: 0,
						marginBottom: 'var(--spacing-sm)',
						color: 'var(--color-text-secondary)'
					}}>
						工具区
					</p>
					<p style={{
						fontSize: 'var(--font-size-sm)',
						margin: 0,
						color: 'var(--color-text-tertiary)'
					}}>
						更多实用工具即将上线
					</p>
				</div>
			</div>
		</div>
	);
}

