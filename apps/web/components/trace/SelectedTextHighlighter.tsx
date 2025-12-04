'use client';

interface Props {
	body: string;
	selectionRange: { start: number; end: number } | null;
}

/**
 * 在预览区域高亮显示选中的文本
 */
export default function SelectedTextHighlighter({ body, selectionRange }: Props) {
	if (!selectionRange || selectionRange.start === selectionRange.end) {
		return null;
	}

	const selectedText = body.slice(selectionRange.start, selectionRange.end);
	if (!selectedText.trim()) {
		return null;
	}

	// 将正文分为三部分：选中前、选中文本、选中后
	const beforeText = body.slice(0, selectionRange.start);
	const afterText = body.slice(selectionRange.end);

	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				pointerEvents: 'none',
				padding: '12px',
				fontSize: 'var(--font-size-base)',
				lineHeight: 1.8,
				whiteSpace: 'pre-wrap',
				color: 'transparent'
			}}
		>
			<span>{beforeText}</span>
			<span
				style={{
					background: 'rgba(33, 150, 243, 0.15)',
					borderRadius: '2px',
					padding: '1px 2px',
					borderBottom: '2px solid rgba(33, 150, 243, 0.4)'
				}}
			>
				{selectedText}
			</span>
			<span>{afterText}</span>
		</div>
	);
}

