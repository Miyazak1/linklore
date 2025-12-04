'use client';

import { useRef, useEffect, useState } from 'react';

interface Citation {
	id: string;
	order: number;
	title: string;
	url?: string | null;
}

interface Props {
	body: string;
	citations: Citation[];
	onCitationClick?: (citationId: string, order: number) => void;
	editable?: boolean;
	onCitationHover?: (citationId: string | null, order: number | null) => void;
}

/**
 * 渲染正文，高亮引用标记并支持点击跳转
 */
export default function CitationRenderer({ body, citations, onCitationClick, editable = false, onCitationHover }: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [hoveredCitation, setHoveredCitation] = useState<number | null>(null);

	// 解析正文中的引用标记 [1], [2] 等
	const parseBodyWithCitations = () => {
		// 匹配 [数字] 格式的引用标记
		const citationPattern = /\[(\d+)\]/g;
		const parts: Array<{ type: 'text' | 'citation'; content: string; order?: number }> = [];
		let lastIndex = 0;
		let match;

		while ((match = citationPattern.exec(body)) !== null) {
			// 添加标记前的文本
			if (match.index > lastIndex) {
				parts.push({
					type: 'text',
					content: body.slice(lastIndex, match.index)
				});
			}

			// 添加引用标记
			const order = parseInt(match[1], 10);
			parts.push({
				type: 'citation',
				content: match[0],
				order
			});

			lastIndex = match.index + match[0].length;
		}

		// 添加剩余的文本
		if (lastIndex < body.length) {
			parts.push({
				type: 'text',
				content: body.slice(lastIndex)
			});
		}

		// 如果没有匹配到任何引用标记，返回原始文本
		if (parts.length === 0) {
			parts.push({ type: 'text', content: body });
		}

		return parts;
	};

	const parts = parseBodyWithCitations();

	// 滚动到引用位置
	const scrollToCitation = (order: number) => {
		if (!containerRef.current) return;

		// 查找引用元素
		const citationElement = containerRef.current.querySelector(`[data-citation-order="${order}"]`);
		if (citationElement) {
			citationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
			// 高亮效果
			citationElement.classList.add('citation-highlight');
			setTimeout(() => {
				citationElement.classList.remove('citation-highlight');
			}, 2000);
		}
	};

	const handleCitationClick = (order: number) => {
		const citation = citations.find((c) => c.order === order);
		if (citation) {
			if (onCitationClick) {
				onCitationClick(citation.id, order);
			} else {
				scrollToCitation(order);
			}
		}
	};

	return (
		<div ref={containerRef} style={{ position: 'relative' }}>
			{parts.map((part, idx) => {
				if (part.type === 'text') {
					// 普通文本，保持换行
					return (
						<span key={idx}>
							{part.content.split('\n').map((line, lineIdx, lines) => (
								<span key={lineIdx}>
									{line}
									{lineIdx < lines.length - 1 && <br />}
								</span>
							))}
						</span>
					);
				} else {
					// 引用标记
					const citation = citations.find((c) => c.order === part.order);
					const isValid = !!citation;

					return (
						<span
							key={idx}
							data-citation-order={part.order}
							onClick={() => isValid && handleCitationClick(part.order!)}
							onMouseEnter={() => {
								if (isValid && citation) {
									setHoveredCitation(part.order!);
									if (onCitationHover) {
										onCitationHover(citation.id, part.order!);
									}
								}
							}}
							onMouseLeave={() => {
								setHoveredCitation(null);
								if (onCitationHover) {
									onCitationHover(null, null);
								}
							}}
							style={{
								display: 'inline-block',
								padding: '2px 6px',
								margin: '0 2px',
								background: isValid
									? hoveredCitation === part.order
										? 'var(--color-primary)'
										: 'var(--color-primary)'
									: 'var(--color-error)',
								color: '#fff',
								borderRadius: 'var(--radius-sm)',
								fontSize: 'var(--font-size-sm)',
								fontWeight: 600,
								cursor: isValid ? 'pointer' : 'default',
								transition: 'all var(--transition-fast)',
								verticalAlign: 'baseline',
								lineHeight: 1.2,
								opacity: hoveredCitation === part.order ? 1 : isValid ? 0.85 : 0.6
							}}
							title={citation ? `引用 ${part.order}: ${citation.title}` : `无效引用 ${part.order}`}
						>
							{part.content}
						</span>
					);
				}
			})}
			<style jsx>{`
				@keyframes citation-highlight {
					0% {
						background-color: var(--color-primary);
					}
					50% {
						background-color: var(--color-warning);
					}
					100% {
						background-color: var(--color-primary);
					}
				}
				.citation-highlight {
					animation: citation-highlight 0.5s ease-in-out;
				}
			`}</style>
		</div>
	);
}

