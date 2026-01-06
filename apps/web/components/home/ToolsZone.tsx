'use client';

/**
 * 工具区组件
 * 预留区域，后续可以添加各种实用工具
 */
export default function ToolsZone() {
	return (
		<div style={{
			marginTop: '56px'
		}}>
			<div style={{
				marginBottom: '20px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between'
			}}>
				<h2 style={{
					fontSize: '18px',
					fontWeight: 600,
					color: '#2E3038',
					margin: 0
				}}>
					工具区
				</h2>
			</div>

			{/* 预留内容区域 */}
			<div style={{
				padding: '60px 40px',
				background: '#FFFFFF',
				borderRadius: '8px',
				border: '1px dashed rgba(0, 0, 0, 0.12)',
				textAlign: 'center',
				color: '#6B6B6B',
				minHeight: '180px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center'
			}}>
				<div>
					<p style={{
						fontSize: '15px',
						margin: 0,
						marginBottom: '6px',
						color: '#2E3038',
						fontWeight: 500,
						lineHeight: 1.4
					}}>
						工具区
					</p>
					<p style={{
						fontSize: '13px',
						margin: 0,
						color: '#6B6B6B',
						lineHeight: 1.4
					}}>
						更多实用工具即将上线
					</p>
				</div>
			</div>
		</div>
	);
}











