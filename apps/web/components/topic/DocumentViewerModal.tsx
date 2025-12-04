'use client';

import { useState, useEffect } from 'react';

interface DocumentViewerModalProps {
	documentId: string | null;
	documentTitle: string | null;
	onClose: () => void;
}

export default function DocumentViewerModal({ documentId, documentTitle, onClose }: DocumentViewerModalProps) {
	const [content, setContent] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// 加载文档内容
	useEffect(() => {
		if (!documentId) {
			setContent(null);
			return;
		}

		setLoading(true);
		fetch(`/api/documents/${documentId}/content`)
			.then((res) => res.json())
			.then((data) => {
				setContent(data.html || null);
			})
			.catch((err) => {
				console.error('Failed to load document content:', err);
				setContent(null);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [documentId]);

	// ESC键关闭
	useEffect(() => {
		if (!documentId) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', handleEscape);
		// 防止背景滚动
		document.body.style.overflow = 'hidden';

		return () => {
			document.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = '';
		};
	}, [documentId, onClose]);

	if (!documentId) return null;

	return (
		<>
			{/* 遮罩层 */}
			<div
				style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'rgba(0, 0, 0, 0.5)',
					zIndex: 1000,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					padding: 'var(--spacing-xl)',
					overflow: 'auto'
				}}
				onClick={onClose}
			>
				{/* 模态框内容 */}
				<div
					style={{
						background: 'var(--color-background)',
						borderRadius: 'var(--radius-lg)',
						width: '100%',
						maxWidth: '900px',
						maxHeight: '90vh',
						display: 'flex',
						flexDirection: 'column',
						boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
						overflow: 'hidden',
						margin: 'auto'
					}}
					onClick={(e) => e.stopPropagation()}
				>
					{/* 标题栏 */}
					<div
						style={{
							padding: 'var(--spacing-lg)',
							borderBottom: '1px solid var(--color-border-light)',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							background: 'var(--color-background-paper)'
						}}
					>
						<h3 style={{
							margin: 0,
							fontSize: 'var(--font-size-lg)',
							color: 'var(--color-text-primary)',
							fontWeight: 600
						}}>
							{documentTitle || '文档内容'}
						</h3>
						<button
							type="button"
							onClick={onClose}
							style={{
								background: 'none',
								border: 'none',
								fontSize: 'var(--font-size-xl)',
								color: 'var(--color-text-secondary)',
								cursor: 'pointer',
								padding: 'var(--spacing-xs)',
								lineHeight: 1,
								width: '32px',
								height: '32px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								borderRadius: 'var(--radius-sm)',
								transition: 'all var(--transition-fast)'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'var(--color-background-subtle)';
								e.currentTarget.style.color = 'var(--color-text-primary)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'transparent';
								e.currentTarget.style.color = 'var(--color-text-secondary)';
							}}
						>
							×
						</button>
					</div>

					{/* 内容区域 */}
					<div
						style={{
							flex: 1,
							overflowY: 'auto',
							padding: 'var(--spacing-xl)',
							lineHeight: 'var(--line-height-relaxed)',
							fontSize: 'var(--font-size-base)',
							color: 'var(--color-text-primary)',
							fontFamily: 'var(--font-family-serif)'
						}}
						className="document-viewer-content"
					>
						{loading ? (
							<div style={{
								textAlign: 'center',
								padding: 'var(--spacing-xxl)',
								color: 'var(--color-text-secondary)',
								fontStyle: 'italic'
							}}>
								加载中...
							</div>
						) : content === null ? (
							<div style={{
								textAlign: 'center',
								padding: 'var(--spacing-xxl)',
								color: 'var(--color-text-tertiary)',
								fontStyle: 'italic'
							}}>
								文档内容暂不可用
							</div>
						) : (
							<div
								dangerouslySetInnerHTML={{
									__html: `<style>
										.document-content h1 { font-size: 2em; margin: 1em 0 0.5em 0; border-bottom: 2px solid var(--color-border); padding-bottom: 0.3em; }
										.document-content h2 { font-size: 1.5em; margin: 0.8em 0 0.4em 0; border-bottom: 1px solid var(--color-border); padding-bottom: 0.2em; }
										.document-content h3 { font-size: 1.25em; margin: 0.6em 0 0.3em 0; }
										.document-content p { margin: 0.8em 0; }
										.document-content ul, .document-content ol { margin: 0.8em 0; padding-left: 2em; }
										.document-content li { margin: 0.4em 0; }
										.document-content blockquote { border-left: 4px solid var(--color-border); padding-left: 1em; margin: 1em 0; color: var(--color-text-secondary); font-style: italic; }
										.document-content code { background: var(--color-background-paper); padding: 2px 6px; border-radius: 3px; font-family: var(--font-family-mono); font-size: 0.9em; }
										.document-content pre { background: var(--color-background-paper); padding: 1em; border-radius: 4px; overflow-x: auto; margin: 1em 0; }
										.document-content pre code { background: none; padding: 0; }
										.document-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
										.document-content th, .document-content td { border: 1px solid var(--color-border); padding: 8px 12px; text-align: left; }
										.document-content th { background: var(--color-background-paper); font-weight: bold; }
										.document-content a { color: var(--color-primary); text-decoration: none; }
										.document-content a:hover { text-decoration: underline; }
										.document-content img { max-width: 100%; height: auto; margin: 1em 0; }
										.document-content hr { border: none; border-top: 1px solid var(--color-border); margin: 2em 0; }
									</style>
									<div class="document-content">${content}</div>`
								}}
							/>
						)}
					</div>
				</div>
			</div>
		</>
	);
}

