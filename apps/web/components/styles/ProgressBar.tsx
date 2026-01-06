/**
 * ProgressBar - 进度条组件
 * 用于显示进度
 */

import React from 'react';

export interface ProgressBarProps {
	/** 当前值 */
	value?: number;
	/** 最大值 */
	max?: number;
	/** 百分比（0-100），如果提供则忽略 value 和 max */
	percent?: number;
	/** 高度（像素） */
	height?: number;
	/** 颜色 */
	color?: string;
	/** 背景颜色 */
	backgroundColor?: string;
	/** 额外的类名 */
	className?: string;
	/** 额外的样式 */
	style?: React.CSSProperties;
}

/**
 * 进度条组件
 * 
 * @example
 * <ProgressBar percent={75} />
 * <ProgressBar value={3} max={10} />
 */
export function ProgressBar({
	value = 0,
	max = 100,
	percent,
	height = 8,
	color = 'var(--color-primary)',
	backgroundColor = 'var(--color-background-subtle)',
	className,
	style
}: ProgressBarProps) {
	const percentage = percent !== undefined
		? Math.min(100, Math.max(0, percent))
		: max > 0
			? Math.min(100, Math.max(0, (value / max) * 100))
			: 0;

	return (
		<div
			className={className}
			style={{
				width: '100%',
				height: `${height}px`,
				background: backgroundColor,
				borderRadius: 'var(--radius-sm)',
				overflow: 'hidden',
				...(style || {})
			}}
		>
			<div
				style={{
					width: `${percentage}%`,
					height: '100%',
					background: color,
					transition: 'width 0.3s ease'
				}}
			/>
		</div>
	);
}


