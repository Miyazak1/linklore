/**
 * SearchInput - 搜索输入框组件
 * 带搜索图标的输入框
 */

import React from 'react';
import { SearchIcon } from '@/components/ui/Icons';

export interface SearchInputProps {
	/** 输入值 */
	value: string;
	/** 变更回调 */
	onChange: (value: string) => void;
	/** 占位符 */
	placeholder?: string;
	/** 是否禁用 */
	disabled?: boolean;
	/** 额外的类名 */
	className?: string;
	/** 额外的样式 */
	style?: React.CSSProperties;
}

/**
 * 搜索输入框组件
 * 
 * @example
 * <SearchInput
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   placeholder="搜索游戏..."
 * />
 */
export function SearchInput({
	value,
	onChange,
	placeholder = '搜索...',
	disabled = false,
	className,
	style
}: SearchInputProps) {
	return (
		<div
			style={{
				position: 'relative',
				flex: 1,
				minWidth: 200,
				...(style || {})
			}}
			className={className}
		>
			<SearchIcon
				size={20}
				color="var(--color-text-tertiary)"
				style={{
					position: 'absolute',
					left: 'var(--spacing-md)',
					top: '50%',
					transform: 'translateY(-50%)',
					pointerEvents: 'none',
					zIndex: 1
				}}
			/>
			<input
				type="text"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				className="form-input"
				style={{
					paddingLeft: '48px'
				}}
			/>
		</div>
	);
}


