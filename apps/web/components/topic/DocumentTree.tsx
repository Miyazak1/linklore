'use client';

import { useState } from 'react';
import DocumentViewer from './DocumentViewer';

export interface DocumentNode {
	id: string;
	author: { email: string };
	createdAt: Date;
	extractedTextHtml: string | null;
	evaluations: any[];
	summaries: Array<{ title: string }>;
	children: DocumentNode[];
	depth: number;
	topic?: { discipline?: string | null };
}

interface Props {
	documents: DocumentNode[];
	blind?: boolean;
}

export default function DocumentTree({ documents, blind = false }: Props) {
	const [expanded, setExpanded] = useState<Set<string>>(new Set());

	// 默认展开前3层
	const shouldDefaultExpand = (depth: number) => depth < 3;
	
	// 初始化展开状态
	const initializeExpanded = (nodes: DocumentNode[], depth: number = 0) => {
		nodes.forEach(node => {
			if (shouldDefaultExpand(depth)) {
				setExpanded(prev => new Set(prev).add(node.id));
			}
			if (node.children.length > 0) {
				initializeExpanded(node.children, depth + 1);
			}
		});
	};

	useState(() => {
		initializeExpanded(documents);
	});

	const toggleExpand = (nodeId: string) => {
		setExpanded(prev => {
			const newSet = new Set(prev);
			if (newSet.has(nodeId)) {
				newSet.delete(nodeId);
			} else {
				newSet.add(nodeId);
			}
			return newSet;
		});
	};

	const renderNode = (node: DocumentNode, index: number, level: number = 0) => {
		const isExpanded = expanded.has(node.id);
		const hasChildren = node.children.length > 0;
		const indent = level * 32;

		return (
			<div key={node.id} style={{ marginBottom: 'var(--spacing-md)' }}>
				<div style={{ marginLeft: `${indent}px` }}>
					{hasChildren && (
						<button
							type="button"
							onClick={() => toggleExpand(node.id)}
							style={{
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								padding: '0 var(--spacing-xs)',
								fontSize: 'var(--font-size-base)',
								color: 'var(--color-text-secondary)',
								marginRight: 'var(--spacing-xs)',
								verticalAlign: 'middle'
							}}
						>
							{isExpanded ? '▼' : '▶'}
						</button>
					)}
					{!hasChildren && <span style={{ display: 'inline-block', width: '24px' }} />}
					
					<DocumentViewer 
						doc={{
							...node,
							createdAt: node.createdAt.toISOString(),
							topic: node.topic
						} as any}
						docIndex={index}
						blind={blind}
					/>
				</div>
				
				{hasChildren && isExpanded && (
					<div style={{ marginTop: 'var(--spacing-sm)' }}>
						{node.children.map((child, childIndex) => 
							renderNode(child, childIndex, level + 1)
						)}
					</div>
				)}
			</div>
		);
	};

	if (documents.length === 0) {
		return (
			<div className="card-academic" style={{ 
				padding: 'var(--spacing-xl)',
				textAlign: 'center',
				color: 'var(--color-text-secondary)'
			}}>
				暂无文档
			</div>
		);
	}

	return (
		<div>
			{documents.map((node, index) => renderNode(node, index))}
		</div>
	);
}








