'use client';

interface ShareButtonProps {
	onClick: () => void;
	disabled?: boolean;
	hasInviteButton?: boolean; // 是否有邀请按钮（用于调整位置）
}

export default function ShareButton({ onClick, disabled, hasInviteButton = false }: ShareButtonProps) {
	// 如果有邀请按钮，分享按钮在上方；否则在右侧
	const bottom = hasInviteButton ? '160px' : '100px'; // 有邀请按钮时，放在邀请按钮上方
	const right = '20px'; // 统一右对齐
	
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			style={{
				position: 'fixed',
				bottom: bottom,
				right: right,
				padding: '12px 24px',
				background: 'var(--color-primary)',
				color: 'white',
				border: 'none',
				borderRadius: '8px',
				cursor: disabled ? 'not-allowed' : 'pointer',
				boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
				fontSize: '14px',
				fontWeight: '500',
				opacity: disabled ? 0.6 : 1,
				transition: 'all var(--transition-fast)',
				zIndex: 1001, // 确保在输入框之上
			}}
			onMouseEnter={(e) => {
				if (!disabled) {
					e.currentTarget.style.transform = 'translateY(-2px)';
					e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
				}
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.transform = '';
				e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
			}}
			title="分享聊天记录"
		>
			📤 分享
		</button>
	);
}

