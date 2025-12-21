'use client';

interface Citation {
	id: string;
	order: number;
	title: string;
	url?: string | null;
}

interface Props {
	body: string;
	citations: Citation[];
}

/**
 * 简单的引用渲染器（替代 trace 模块的 CitationRenderer）
 */
export default function SimpleCitationRenderer({ body, citations }: Props) {
	// 简单渲染：将 [1], [2] 等标记高亮显示
	const parts = body.split(/(\[\d+\])/g);
	
	return (
		<div>
			{parts.map((part, idx) => {
				const citationMatch = part.match(/\[(\d+)\]/);
				if (citationMatch) {
					const order = parseInt(citationMatch[1], 10);
					const citation = citations.find((c) => c.order === order);
					return (
						<span
							key={idx}
							style={{
								display: 'inline-block',
								padding: '2px 6px',
								margin: '0 2px',
								background: citation ? 'var(--color-primary)' : 'var(--color-error)',
								color: '#fff',
								borderRadius: 'var(--radius-sm)',
								fontSize: 'var(--font-size-sm)',
								fontWeight: 600,
								verticalAlign: 'baseline',
								lineHeight: 1.2,
								opacity: citation ? 0.85 : 0.6
							}}
							title={citation ? `引用 ${order}: ${citation.title}` : `无效引用 ${order}`}
						>
							{part}
						</span>
					);
				}
				return <span key={idx}>{part}</span>;
			})}
		</div>
	);
}

