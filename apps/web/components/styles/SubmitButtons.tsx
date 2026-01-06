/**
 * SubmitButtons - 提交按钮组组件
 * 用于显示提交和取消等操作按钮
 */

import React from 'react';
import { RocketIcon } from '@/components/ui/Icons';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export interface SubmitButton {
	/** 按钮文字 */
	label: string;
	/** 点击回调 */
	onClick: () => void | Promise<void>;
	/** 是否禁用 */
	disabled?: boolean;
	/** 是否加载中 */
	loading?: boolean;
	/** 按钮类型 */
	variant?: 'primary' | 'secondary' | 'danger';
	/** 图标（可选） */
	icon?: React.ReactNode;
}

export interface SubmitButtonsProps {
	/** 按钮列表 */
	buttons: SubmitButton[];
	/** 额外的类名 */
	className?: string;
	/** 对齐方式 */
	align?: 'left' | 'center' | 'right';
}

/**
 * 提交按钮组组件
 * 
 * @example
 * <SubmitButtons
 *   buttons={[
 *     {
 *       label: '保存草稿',
 *       onClick: () => handleSave(true),
 *       loading: saving
 *     },
 *     {
 *       label: '提交',
 *       onClick: () => handleSave(false),
 *       variant: 'primary',
 *       loading: saving,
 *       icon: <RocketIcon />
 *     }
 *   ]}
 * />
 */
export function SubmitButtons({
	buttons,
	className,
	align = 'right'
}: SubmitButtonsProps) {
	const getButtonClassName = (variant?: string) => {
		switch (variant) {
			case 'primary':
				return 'btn-academic-primary';
			case 'danger':
				return 'btn-academic';
			default:
				return 'btn-academic';
		}
	};

	const getButtonStyle = (variant?: string, loading?: boolean): React.CSSProperties => {
		const baseStyle: React.CSSProperties = {
			padding: 'var(--spacing-md) var(--spacing-xl)',
			fontSize: 'var(--font-size-base)',
			display: 'flex',
			alignItems: 'center',
			gap: 'var(--spacing-xs)'
		};

		if (variant === 'danger') {
			baseStyle.color = 'var(--color-error)';
		}

		return baseStyle;
	};

	const getAlignStyle = (): React.CSSProperties => {
		switch (align) {
			case 'left':
				return { justifyContent: 'flex-start' };
			case 'center':
				return { justifyContent: 'center' };
			default:
				return { justifyContent: 'flex-end' };
		}
	};

	return (
		<div
			className={`submit-buttons ${className || ''}`}
			style={getAlignStyle()}
		>
			{buttons.map((button, index) => (
				<button
					key={index}
					type="button"
					onClick={button.onClick}
					disabled={button.disabled || button.loading}
					className={getButtonClassName(button.variant)}
					style={getButtonStyle(button.variant, button.loading)}
				>
					{button.loading ? (
						<LoadingSpinner size="sm" color="currentColor" />
					) : (
						button.icon && <span>{button.icon}</span>
					)}
					<span>{button.label}</span>
				</button>
			))}
		</div>
	);
}


