/**
 * ErrorMessage - 错误提示组件
 * 用于显示错误或成功消息
 */

import React from 'react';

export interface ErrorMessageProps {
	/** 消息内容 */
	message: string;
	/** 消息类型 */
	type?: 'error' | 'success' | 'warning' | 'info';
	/** 是否显示 */
	visible?: boolean;
	/** 额外的类名 */
	className?: string;
	/** 关闭回调（可选，如果提供则显示关闭按钮） */
	onClose?: () => void;
}

/**
 * 错误提示组件
 * 
 * @example
 * <ErrorMessage
 *   message="操作失败"
 *   type="error"
 *   visible={hasError}
 *   onClose={() => setHasError(false)}
 * />
 */
export function ErrorMessage({
	message,
	type = 'error',
	visible = true,
	className,
	onClose
}: ErrorMessageProps) {
	if (!visible || !message) return null;

	const getClassName = () => {
		switch (type) {
			case 'success':
				return 'success-message';
			case 'warning':
				return 'error-message'; // 使用相同的样式，但可以扩展
			case 'info':
				return 'error-message'; // 使用相同的样式，但可以扩展
			default:
				return 'error-message';
		}
	};

	return (
		<div className={`${getClassName()} ${className || ''}`}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<span>{message}</span>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							padding: '0',
							marginLeft: 'var(--spacing-sm)',
							fontSize: 'var(--font-size-lg)',
							lineHeight: 1,
							color: 'inherit',
							opacity: 0.7
						}}
						title="关闭"
					>
						×
					</button>
				)}
			</div>
		</div>
	);
}


