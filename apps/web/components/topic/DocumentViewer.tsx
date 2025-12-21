'use client';
import { useState } from 'react';
import DocumentQualityHint from './DocumentQualityHint';
import { checkDocumentQuality } from '@/lib/processing/documentQuality';

type Doc = {
	id: string;
	author: { email: string };
	createdAt: string; // ISO string from server
	extractedTextHtml: string | null; // Already converted to string on server
	evaluations: any[];
	topic?: { discipline?: string | null };
};

export default function DocumentViewer({ doc, docIndex, blind }: { doc: Doc; docIndex: number; blind: boolean }) {
	const [expanded, setExpanded] = useState(false);
	const html = doc.extractedTextHtml;
	
	// 质量检查
	const qualityCheck = doc.evaluations && doc.evaluations.length > 0
		? checkDocumentQuality(doc.evaluations[0], doc.topic?.discipline || undefined)
		: null;

	return (
		<div>
			<div style={{ 
				display: 'flex', 
				alignItems: 'center', 
				gap: 'var(--spacing-md)', 
				marginBottom: expanded ? 'var(--spacing-md)' : 0,
				flexWrap: 'wrap',
				paddingBottom: expanded ? 'var(--spacing-sm)' : 0,
				borderBottom: expanded ? '1px solid var(--color-border-light)' : 'none'
			}}>
				<span style={{ 
					fontWeight: 700,
					fontSize: 'var(--font-size-lg)',
					color: 'var(--color-primary)',
					minWidth: '40px'
				}}>#{docIndex}</span>
				<span style={{ fontSize: 'var(--font-size-sm)' }}>
					<strong>作者：</strong>{blind ? '匿名' : doc.author.email}
				</span>
				<span style={{ 
					color: 'var(--color-text-secondary)', 
					fontSize: 'var(--font-size-sm)'
				}}>
					<strong>上传于：</strong>
					{new Date(doc.createdAt).toLocaleString('zh-CN')}
				</span>
				{!doc.extractedTextHtml && (
					<span style={{ 
						color: 'var(--color-warning)', 
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500
					}}>处理中...</span>
				)}
				{html && (
					<div style={{ 
						marginLeft: 'auto'
					}}>
						<button
							type="button"
							onClick={() => setExpanded(!expanded)}
							className="btn-academic-primary"
							style={{
								padding: 'var(--spacing-xs) var(--spacing-md)',
								fontSize: 'var(--font-size-sm)',
								background: expanded ? 'var(--color-warning)' : 'var(--color-primary)',
								borderColor: expanded ? 'var(--color-warning)' : 'var(--color-primary)'
							}}
						>
							{expanded ? '收起' : '查看'}
						</button>
					</div>
				)}
			</div>
			{expanded && html && (
				<div
					className="card"
					style={{
						padding: 'var(--spacing-xl)',
						lineHeight: 'var(--line-height-relaxed)',
						fontSize: 'var(--font-size-base)',
						color: 'var(--color-text-primary)',
						marginTop: 'var(--spacing-md)',
						fontFamily: 'var(--font-family-serif)'
					}}
				>
					<DocumentQualityHint qualityCheck={qualityCheck} />
					<div
						dangerouslySetInnerHTML={{
							__html: `<style>
								.document-content h1 { font-size: 2em; margin: 1em 0 0.5em 0; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.3em; }
								.document-content h2 { font-size: 1.5em; margin: 0.8em 0 0.4em 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.2em; }
								.document-content h3 { font-size: 1.25em; margin: 0.6em 0 0.3em 0; }
								.document-content p { margin: 0.8em 0; }
								.document-content ul, .document-content ol { margin: 0.8em 0; padding-left: 2em; }
								.document-content li { margin: 0.4em 0; }
								.document-content blockquote { border-left: 4px solid #ddd; padding-left: 1em; margin: 1em 0; color: #666; font-style: italic; }
								.document-content code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 0.9em; }
								.document-content pre { background: #f5f5f5; padding: 1em; border-radius: 4px; overflow-x: auto; margin: 1em 0; }
								.document-content pre code { background: none; padding: 0; }
								.document-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
								.document-content th, .document-content td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
								.document-content th { background: #f9f9f9; font-weight: bold; }
								.document-content a { color: #1976d2; text-decoration: none; }
								.document-content a:hover { text-decoration: underline; }
								.document-content img { max-width: 100%; height: auto; margin: 1em 0; }
								.document-content hr { border: none; border-top: 1px solid #e0e0e0; margin: 2em 0; }
							</style>
							<div class="document-content">${html}</div>`
						}}
					/>
					{doc.evaluations && doc.evaluations.length > 0 && (
						<div className="card-academic" style={{ 
							marginTop: 'var(--spacing-xl)', 
							padding: 'var(--spacing-lg)',
							borderLeftColor: 'var(--color-primary)',
							background: 'var(--color-background-subtle)'
						}}>
							<h4 style={{ 
								marginTop: 0, 
								marginBottom: 'var(--spacing-md)',
								fontSize: 'var(--font-size-base)',
								color: 'var(--color-primary)'
							}}>AI 评价</h4>
							{doc.evaluations.map((evaluation: any) => {
								const scores = typeof evaluation.scores === 'object' ? evaluation.scores : {};
								const scoreEntries = Object.entries(scores);
								return (
									<div key={evaluation.id}>
										<div style={{ 
											fontWeight: 600, 
											marginBottom: 'var(--spacing-sm)',
											fontSize: 'var(--font-size-sm)',
											paddingBottom: 'var(--spacing-xs)',
											borderBottom: '1px solid var(--color-border-light)'
										}}>
											学科：{evaluation.discipline || '未分类'}
										</div>
										<div style={{ 
											display: 'flex',
											flexDirection: 'column',
											gap: 'var(--spacing-xs)',
											marginTop: 'var(--spacing-sm)',
											marginBottom: 'var(--spacing-sm)'
										}}>
											{scoreEntries.map(([key, value]) => (
												<div key={key} style={{ 
													display: 'flex',
													justifyContent: 'space-between',
													fontSize: 'var(--font-size-sm)'
												}}>
													<span style={{ color: 'var(--color-text-secondary)' }}>{key}：</span>
													<span style={{ 
														fontWeight: 600,
														color: typeof value === 'number' && value >= 8 ? 'var(--color-success)' : 
														       typeof value === 'number' && value >= 6 ? 'var(--color-warning)' : 
														       'var(--color-text-primary)'
													}}>
														{typeof value === 'number' ? `${value}/10` : (typeof value === 'string' ? value : 'N/A')}
													</span>
												</div>
											))}
										</div>
										{evaluation.verdict && (
											<div style={{ 
												marginTop: 'var(--spacing-sm)',
												paddingTop: 'var(--spacing-sm)',
												borderTop: '1px solid var(--color-border-light)',
												fontSize: 'var(--font-size-sm)', 
												color: 'var(--color-text-secondary)', 
												lineHeight: 'var(--line-height-relaxed)',
												fontStyle: 'italic'
											}}>
												{evaluation.verdict}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

