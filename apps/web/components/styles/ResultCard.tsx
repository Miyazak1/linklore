/**
 * ResultCard - 结果卡片组件
 * 用于显示正确/错误结果
 */

import React from 'react';

export interface ResultCardProps {
	/** 是否正确 */
	correct: boolean;
	/** 正确答案（错误时显示） */
	correctAnswer?: string | string[];
	/** 额外的类名 */
	className?: string;
}

/**
 * 结果卡片组件
 * 
 * @example
 * <ResultCard
 *   correct={isCorrect}
 *   correctAnswer={correctAnswer}
 * />
 */
export function ResultCard({
	correct,
	correctAnswer,
	className
}: ResultCardProps) {
	const displayAnswer = Array.isArray(correctAnswer)
		? correctAnswer.join(' 或 ')
		: correctAnswer;

	return (
		<div
			className={className}
			style={{
				padding: 'var(--spacing-md)',
				marginBottom: 'var(--spacing-lg)',
				borderRadius: 'var(--radius-sm)',
				background: correct
					? 'var(--color-success-lighter)'
					: 'var(--color-error-lighter)',
				color: correct
					? 'var(--color-success-dark)'
					: 'var(--color-error-dark)',
				textAlign: 'center'
			}}
		>
			{correct ? '✓ 回答正确！' : '✗ 回答错误'}
			{!correct && displayAnswer && (
				<div
					style={{
						marginTop: 'var(--spacing-xs)',
						fontSize: 'var(--font-size-sm)'
					}}
				>
					正确答案：{displayAnswer}
				</div>
			)}
		</div>
	);
}


