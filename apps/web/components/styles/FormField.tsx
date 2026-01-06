/**
 * FormField - 表单字段组件
 * 提供统一的表单字段样式和结构
 */

import React from 'react';

export interface FormFieldProps {
	/** 字段标签 */
	label?: string;
	/** 提示文字 */
	hint?: string;
	/** 错误信息 */
	error?: string;
	/** 是否必填 */
	required?: boolean;
	/** 子元素（通常是输入框） */
	children: React.ReactNode;
	/** 额外的类名 */
	className?: string;
}

/**
 * 表单字段组件
 * 
 * @example
 * <FormField label="标题" required hint="请输入游戏标题">
 *   <input type="text" className="form-input" />
 * </FormField>
 */
export function FormField({
	label,
	hint,
	error,
	required,
	children,
	className
}: FormFieldProps) {
	return (
		<div className={className}>
			{label && (
				<label className="form-label">
					{label}
					{required && (
						<span style={{ color: 'var(--color-error)', marginLeft: '4px' }}>*</span>
					)}
				</label>
			)}
			{hint && <p className="form-hint">{hint}</p>}
			{children}
			{error && (
				<div className="error-message" style={{ marginTop: 'var(--spacing-xs)' }}>
					{error}
				</div>
			)}
		</div>
	);
}


