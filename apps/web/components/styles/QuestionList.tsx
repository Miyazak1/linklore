/**
 * QuestionList - 题目列表组件
 * 用于显示和管理题目列表
 */

import React from 'react';

export interface Question {
	id: string;
	answer: string;
	hint?: string;
}

export interface QuestionListProps {
	/** 题目列表 */
	questions: Question[];
	/** 题目变更回调 */
	onChange: (index: number, field: 'answer' | 'hint', value: string) => void;
	/** 是否显示提示输入框 */
	showHints?: boolean;
	/** 题目删除回调（可选） */
	onDelete?: (index: number) => void;
	/** 额外的类名 */
	className?: string;
}

/**
 * 题目列表组件
 * 
 * @example
 * <QuestionList
 *   questions={questions}
 *   onChange={(idx, field, value) => {
 *     // 更新题目
 *   }}
 *   showHints={true}
 * />
 */
export function QuestionList({
	questions,
	onChange,
	showHints = false,
	onDelete,
	className
}: QuestionListProps) {
	return (
		<div className={`question-list ${className || ''}`}>
			{questions.map((q, idx) => (
				<div key={q.id} className="question-item">
					<span className="question-number">{idx + 1}.</span>
					<input
						type="text"
						value={q.answer}
						onChange={(e) => onChange(idx, 'answer', e.target.value)}
						placeholder="答案"
						className="question-input"
					/>
					{showHints && (
						<input
							type="text"
							value={q.hint || ''}
							onChange={(e) => onChange(idx, 'hint', e.target.value)}
							placeholder="提示"
							className="question-hint"
						/>
					)}
					{onDelete && questions.length > 1 && (
						<button
							type="button"
							onClick={() => onDelete(idx)}
							className="btn-academic"
							style={{
								padding: 'var(--spacing-xs) var(--spacing-sm)',
								fontSize: 'var(--font-size-xs)',
								minWidth: 'auto'
							}}
							title="删除此题"
						>
							×
						</button>
					)}
				</div>
			))}
		</div>
	);
}


