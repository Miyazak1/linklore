'use client';

import { useState, useEffect } from 'react';
import DocumentViewerModal from './DocumentViewerModal';

export interface DocumentNode {
	id: string;
	author: { email: string };
	createdAt: Date;
	summaries: Array<{ title: string }>;
	children: DocumentNode[];
	depth: number;
}

interface Props {
	topicId: string;
	documents: DocumentNode[];
	selectedParentId: string | null;
	onSelect: (parentId: string | null) => void;
}

export default function DocumentTreeSelector({ topicId, documents, selectedParentId, onSelect }: Props) {
	const [expanded, setExpanded] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState('');
	const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
	const [viewingDocumentTitle, setViewingDocumentTitle] = useState<string | null>(null);

	// 展开所有节点（默认）
	useEffect(() => {
		const allIds = new Set<string>();
		const collectIds = (nodes: DocumentNode[]) => {
			nodes.forEach(node => {
				allIds.add(node.id);
				if (node.children.length > 0) {
					collectIds(node.children);
				}
			});
		};
		collectIds(documents);
		setExpanded(allIds);
	}, [documents]);

	const toggleExpand = (nodeId: string) => {
		const newExpanded = new Set(expanded);
		if (newExpanded.has(nodeId)) {
			newExpanded.delete(nodeId);
		} else {
			newExpanded.add(nodeId);
		}
		setExpanded(newExpanded);
	};

	// 过滤文档树
	const filterTree = (nodes: DocumentNode[]): DocumentNode[] => {
		if (!searchQuery.trim()) return nodes;
		
		const query = searchQuery.toLowerCase();
		return nodes
			.map(node => {
				const matches = 
					node.summaries[0]?.title?.toLowerCase().includes(query) ||
					node.author.email.toLowerCase().includes(query);
				
				const filteredChildren = filterTree(node.children);
				const hasMatchingChild = filteredChildren.length > 0;
				
				if (matches || hasMatchingChild) {
					return {
						...node,
						children: filteredChildren
					};
				}
				return null;
			})
			.filter((node): node is DocumentNode => node !== null);
	};

	const filteredDocuments = filterTree(documents);

	const handleView = (nodeId: string, nodeTitle: string | null) => {
		setViewingDocumentId(nodeId);
		setViewingDocumentTitle(nodeTitle);
	};

	const renderNode = (node: DocumentNode, level: number = 0) => {
		const isExpanded = expanded.has(node.id);
		const isSelected = selectedParentId === node.id;
		const hasChildren = node.children.length > 0;
		const indent = level * 24;
		const nodeTitle = node.summaries[0]?.title || '处理中...';

		return (
			<div key={node.id}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						padding: 'var(--spacing-xs) var(--spacing-sm)',
						marginLeft: `${indent}px`,
						cursor: 'pointer',
						borderRadius: 'var(--radius-sm)',
						background: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
						border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
						transition: 'all 0.2s'
					}}
					onClick={() => onSelect(node.id)}
					onMouseEnter={(e) => {
						if (!isSelected) {
							e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
						}
					}}
					onMouseLeave={(e) => {
						if (!isSelected) {
							e.currentTarget.style.background = 'transparent';
						}
					}}
				>
					{hasChildren && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								toggleExpand(node.id);
							}}
							style={{
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								padding: '0 var(--spacing-xs)',
								fontSize: 'var(--font-size-sm)',
								color: 'var(--color-text-secondary)',
								width: '20px',
								textAlign: 'center'
							}}
						>
							{isExpanded ? '▼' : '▶'}
						</button>
					)}
					{!hasChildren && <div style={{ width: '20px' }} />}
					
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: isSelected ? 600 : 400,
							color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap'
						}}>
							{node.summaries[0]?.title || '处理中...'}
						</div>
						<div style={{ 
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-secondary)',
							marginTop: '2px'
						}}>
							{node.author.email} · {new Date(node.createdAt).toLocaleDateString('zh-CN')}
						</div>
					</div>
					
					{/* 下载和查看按钮 */}
					<div 
						style={{ 
							display: 'flex', 
							gap: 'var(--spacing-xs)',
							marginLeft: 'var(--spacing-xs)',
							alignItems: 'center'
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<a
							href={`/api/documents/${node.id}/download`}
							download
							className="btn-academic"
							style={{
								padding: '2px var(--spacing-xs)',
								fontSize: 'var(--font-size-xs)',
								background: 'var(--color-success)',
								color: '#fff',
								borderColor: 'var(--color-success)',
								textDecoration: 'none',
								borderRadius: 'var(--radius-sm)',
								whiteSpace: 'nowrap'
							}}
							onClick={(e) => e.stopPropagation()}
						>
							下载
						</a>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleView(node.id, nodeTitle);
							}}
							className="btn-academic-primary"
							style={{
								padding: '2px var(--spacing-xs)',
								fontSize: 'var(--font-size-xs)',
								background: 'var(--color-primary)',
								borderColor: 'var(--color-primary)',
								borderRadius: 'var(--radius-sm)',
								whiteSpace: 'nowrap'
							}}
						>
							查看
						</button>
					</div>
					
					{isSelected && (
						<span style={{ 
							color: 'var(--color-primary)',
							fontSize: 'var(--font-size-xs)',
							marginLeft: 'var(--spacing-xs)'
						}}>
							✓
						</span>
					)}
				</div>
				
				
				{hasChildren && isExpanded && (
					<div>
						{node.children.map(child => renderNode(child, level + 1))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="card-academic" style={{ padding: 'var(--spacing-md)' }}>
			<div style={{ marginBottom: 'var(--spacing-md)' }}>
				<label style={{ 
					display: 'block',
					fontSize: 'var(--font-size-sm)',
					fontWeight: 600,
					marginBottom: 'var(--spacing-xs)',
					color: 'var(--color-text-primary)'
				}}>
					选择回复目标
				</label>
				<p style={{ 
					fontSize: 'var(--font-size-xs)',
					color: 'var(--color-text-secondary)',
					margin: 0
				}}>
					选择要回复的文档，或选择"直接回复主题"
				</p>
			</div>
			
			<div style={{ marginBottom: 'var(--spacing-sm)' }}>
				<input
					type="text"
					placeholder="搜索文档..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					style={{
						width: '100%',
						padding: 'var(--spacing-xs) var(--spacing-sm)',
						border: '1px solid var(--color-border-light)',
						borderRadius: 'var(--radius-sm)',
						fontSize: 'var(--font-size-sm)',
						background: 'var(--color-background)',
						color: 'var(--color-text-primary)'
					}}
				/>
			</div>
			
			<div style={{ 
				maxHeight: '400px',
				overflowY: 'auto',
				border: '1px solid var(--color-border-light)',
				borderRadius: 'var(--radius-sm)',
				padding: 'var(--spacing-xs)'
			}}>
				{filteredDocuments.length === 0 ? (
					<div style={{ 
						padding: 'var(--spacing-md)',
						textAlign: 'center',
						color: 'var(--color-text-secondary)',
						fontSize: 'var(--font-size-sm)'
					}}>
						{searchQuery ? '未找到匹配的文档' : '暂无文档'}
					</div>
				) : (
					<>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								padding: 'var(--spacing-xs) var(--spacing-sm)',
								cursor: 'pointer',
								borderRadius: 'var(--radius-sm)',
								background: selectedParentId === null ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
								border: selectedParentId === null ? '1px solid var(--color-primary)' : '1px solid transparent',
								marginBottom: 'var(--spacing-xs)',
								transition: 'all 0.2s'
							}}
							onClick={() => onSelect(null)}
							onMouseEnter={(e) => {
								if (selectedParentId !== null) {
									e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
								}
							}}
							onMouseLeave={(e) => {
								if (selectedParentId !== null) {
									e.currentTarget.style.background = 'transparent';
								}
							}}
						>
							<div style={{ flex: 1 }}>
								<div style={{ 
									fontSize: 'var(--font-size-sm)',
									fontWeight: selectedParentId === null ? 600 : 400,
									color: selectedParentId === null ? 'var(--color-primary)' : 'var(--color-text-primary)'
								}}>
									直接回复主题
								</div>
							</div>
							{selectedParentId === null && (
								<span style={{ 
									color: 'var(--color-primary)',
									fontSize: 'var(--font-size-xs)',
									marginLeft: 'var(--spacing-xs)'
								}}>
									✓
								</span>
							)}
						</div>
						{filteredDocuments.map(node => renderNode(node))}
					</>
				)}
			</div>
			
			{/* 文档查看模态框 */}
			<DocumentViewerModal
				documentId={viewingDocumentId}
				documentTitle={viewingDocumentTitle}
				onClose={() => {
					setViewingDocumentId(null);
					setViewingDocumentTitle(null);
				}}
			/>
		</div>
	);
}





