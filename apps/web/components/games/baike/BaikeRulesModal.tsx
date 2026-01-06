'use client';

import Modal from '@/components/ui/Modal';

interface BaikeRulesModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function BaikeRulesModal({ isOpen, onClose }: BaikeRulesModalProps) {
	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="「百科」规则说明"
			maxWidth="480px"
		>
			<div style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '16px'
			}}>
				{/* 规则列表 */}
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '12px'
				}}>
					<div style={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: '12px'
					}}>
						<span style={{
							color: 'var(--color-primary)',
							fontSize: '16px',
							fontWeight: 600,
							flexShrink: 0
						}}>1.</span>
						<p style={{
							margin: 0,
							fontSize: '14px',
							lineHeight: '1.6',
							color: 'var(--color-text-primary)'
						}}>
							每天北京时间0点题目更新。
						</p>
					</div>

					<div style={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: '12px'
					}}>
						<span style={{
							color: 'var(--color-primary)',
							fontSize: '16px',
							fontWeight: 600,
							flexShrink: 0
						}}>2.</span>
						<p style={{
							margin: 0,
							fontSize: '14px',
							lineHeight: '1.6',
							color: 'var(--color-text-primary)'
						}}>
							您有无数次机会来尝试猜当日隐藏百科内容。
						</p>
					</div>

					<div style={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: '12px'
					}}>
						<span style={{
							color: 'var(--color-primary)',
							fontSize: '16px',
							fontWeight: 600,
							flexShrink: 0
						}}>3.</span>
						<p style={{
							margin: 0,
							fontSize: '14px',
							lineHeight: '1.6',
							color: 'var(--color-text-primary)'
						}}>
							每次只允许猜测一个字，猜对后会显示在对应位置。
						</p>
					</div>

					<div style={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: '12px'
					}}>
						<span style={{
							color: 'var(--color-primary)',
							fontSize: '16px',
							fontWeight: 600,
							flexShrink: 0
						}}>4.</span>
						<p style={{
							margin: 0,
							fontSize: '14px',
							lineHeight: '1.6',
							color: 'var(--color-text-primary)'
						}}>
							猜出标题即算猜对（第一行）。
						</p>
					</div>
				</div>

				{/* 反馈按钮 */}
				<div style={{
					marginTop: '8px',
					paddingTop: '16px',
					borderTop: '1px solid var(--color-border-light)'
				}}>
					<button
						onClick={onClose}
						style={{
							width: '100%',
							padding: '10px 16px',
							background: 'var(--color-primary)',
							color: 'white',
							border: 'none',
							borderRadius: 'var(--radius-sm)',
							cursor: 'pointer',
							fontSize: '14px',
							fontWeight: 500,
							transition: 'background 0.2s'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'var(--color-primary-dark)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'var(--color-primary)';
						}}
					>
						知道了
					</button>
				</div>
			</div>
		</Modal>
	);
}

