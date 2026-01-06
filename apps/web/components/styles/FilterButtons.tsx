/**
 * FilterButtons - 筛选按钮组组件
 * 用于显示多个筛选选项的按钮组
 */

import React from 'react';

export interface FilterOption {
	/** 选项值 */
	value: string;
	/** 显示标签 */
	label: string;
}

export interface FilterButtonsProps {
	/** 选项列表 */
	options: FilterOption[];
	/** 当前选中的值 */
	value: string;
	/** 变更回调 */
	onChange: (value: string) => void;
	/** 额外的类名 */
	className?: string;
	/** 额外的样式 */
	style?: React.CSSProperties;
}

/**
 * 筛选按钮组组件
 * 
 * @example
 * <FilterButtons
 *   options={[
 *     { value: 'all', label: '全部' },
 *     { value: 'published', label: '已发布' }
 *   ]}
 *   value={filterStatus}
 *   onChange={setFilterStatus}
 * />
 */
export function FilterButtons({
	options,
	value,
	onChange,
	className,
	style
}: FilterButtonsProps) {
	return (
		<div
			className={className}
			style={{
				display: 'flex',
				gap: 'var(--spacing-xs)',
				background: 'var(--color-background-subtle)',
				padding: 'var(--spacing-xxs)',
				borderRadius: 'var(--radius-md)',
				...(style || {})
			}}
		>
			{options.map((option) => {
				const isActive = value === option.value;
				return (
					<button
						key={option.value}
						type="button"
						onClick={() => onChange(option.value)}
						style={{
							padding: 'var(--spacing-xs) var(--spacing-md)',
							border: 'none',
							borderRadius: 'var(--radius-sm)',
							background: isActive
								? 'var(--color-background-paper)'
								: 'transparent',
							color: isActive
								? 'var(--color-text-primary)'
								: 'var(--color-text-secondary)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: isActive ? 600 : 400,
							cursor: 'pointer',
							transition: 'all var(--transition-fast)'
						}}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}


