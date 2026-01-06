/**
 * ActionButtons - 操作按钮组组件
 * 用于显示一组操作按钮
 */

import React from 'react';

export interface ActionButton {
	/** 按钮文字 */
	label: string;
	/** 点击回调 */
	onClick: () => void;
	/** 是否禁用 */
	disabled?: boolean;
	/** 按钮类型 */
	variant?: 'default' | 'danger' | 'primary';
	/** 图标（可选） */
	icon?: React.ReactNode;
}

export interface ActionButtonsProps {
	/** 按钮列表 */
	buttons: ActionButton[];
	/** 额外的类名 */
	className?: string;
	/** 是否垂直排列 */
	vertical?: boolean;
	/** 额外的样式 */
	style?: React.CSSProperties;
}

/**
 * 操作按钮组组件
 * 
 * @example
 * <ActionButtons
 *   buttons={[
 *     { label: '加一题', onClick: () => addQuestion() },
 *     { label: '删除', onClick: () => deleteQuestion(), variant: 'danger' }
 *   ]}
 * />
 */
export function ActionButtons({
	buttons,
	className,
	vertical = false,
	style
}: ActionButtonsProps) {
	const getButtonClassName = (variant?: string) => {
		switch (variant) {
			case 'danger':
				return 'btn-academic';
			case 'primary':
				return 'btn-academic-primary';
			default:
				return 'btn-academic';
		}
	};

	const getButtonStyle = (variant?: string) => {
		const baseStyle: React.CSSProperties = {
			fontSize: 'var(--font-size-sm)'
		};

		if (variant === 'danger') {
			baseStyle.color = 'var(--color-error)';
		}

		return baseStyle;
	};

	return (
		<div
			className={`action-buttons ${className || ''}`}
			style={{
				...(vertical ? { flexDirection: 'column' } : {}),
				...(style || {})
			}}
		>
			{buttons.map((button, index) => (
				<button
					key={index}
					type="button"
					onClick={button.onClick}
					disabled={button.disabled}
					className={getButtonClassName(button.variant)}
					style={getButtonStyle(button.variant)}
				>
					{button.icon && <span style={{ marginRight: 'var(--spacing-xs)' }}>{button.icon}</span>}
					{button.label}
				</button>
			))}
		</div>
	);
}

