'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import CitationManager, { type CitationData } from './CitationManager';
import CitationRenderer from './CitationRenderer';
import { useCollaboration } from '@/hooks/useCollaboration';

interface Props {
	traceId?: string; // 如果提供，则是编辑模式
	initialData?: {
		title: string;
		traceType: string;
		target: string;
		body: string;
		citations: CitationData[];
		version?: number;
	};
}

const typeOptions = [
	{ value: 'CONCEPT', label: '概念' },
	{ value: 'EVENT', label: '事件' },
	{ value: 'FACT', label: '事实' },
	{ value: 'PERSON', label: '人物' },
	{ value: 'THEORY', label: '理论' },
	{ value: 'DEFINITION', label: '定义' }
];

export default function TraceEditor({ traceId, initialData }: Props) {
	const router = useRouter();
	const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [formData, setFormData] = useState({
		title: initialData?.title || '',
		traceType: initialData?.traceType || 'CONCEPT',
		target: initialData?.target || '',
		body: initialData?.body || '',
		citations: initialData?.citations || [] as CitationData[]
	});

	const [version, setVersion] = useState(initialData?.version || (initialData ? 1 : 0));
	const [conflictWarning, setConflictWarning] = useState<string | null>(null);

	// 实时协作（仅在编辑模式下启用）
	const { connected, activeUsers, sendEvent } = useCollaboration({
		traceId: traceId || '',
		enabled: !!traceId,
		onConflict: () => {
			setConflictWarning('检测到编辑冲突，请刷新页面后重试');
		},
		onUserJoined: (userId, userEmail) => {
			console.log(`[TraceEditor] User joined: ${userEmail}`);
		},
		onUserLeft: (userId) => {
			console.log(`[TraceEditor] User left: ${userId}`);
		}
	});

	// 自动保存草稿（IndexedDB + localStorage + 服务器）
	useEffect(() => {
		if (autoSaveTimerRef.current) {
			clearTimeout(autoSaveTimerRef.current);
		}

		autoSaveTimerRef.current = setTimeout(async () => {
			const draftKey = traceId ? `trace-draft-${traceId}` : 'trace-draft-new';
			const draftData = {
				title: formData.title,
				traceType: formData.traceType,
				target: formData.target,
				body: formData.body,
				citations: formData.citations,
				timestamp: Date.now()
			};

			try {
				// 导入草稿存储工具
				const { saveDraft, syncDraftToServer } = await import('@/lib/storage/draftStorage');
				
				// 保存到本地（IndexedDB + localStorage）
				await saveDraft(draftKey, draftData);
				
				// 同步到服务器（异步，不阻塞）
				syncDraftToServer(traceId || null, draftData).catch(err => {
					console.warn('[TraceEditor] Failed to sync draft to server:', err);
				});
			} catch (err) {
				console.warn('[TraceEditor] Failed to save draft:', err);
			}
		}, 30000); // 30秒自动保存

		return () => {
			if (autoSaveTimerRef.current) {
				clearTimeout(autoSaveTimerRef.current);
			}
		};
	}, [formData, traceId]);

	// 恢复草稿（优先服务器，然后本地）
	useEffect(() => {
		if (!initialData) {
			const draftKey = traceId ? `trace-draft-${traceId}` : 'trace-draft-new';
			
			(async () => {
				try {
					// 导入草稿存储工具
					const { loadDraft, loadDraftFromServer, saveDraft } = await import('@/lib/storage/draftStorage');
					
					// 先尝试从服务器加载
					const serverDraft = await loadDraftFromServer(traceId || null);
					if (serverDraft) {
						// 如果服务器有草稿，同步到本地
						await saveDraft(draftKey, serverDraft);
						setFormData({
							title: serverDraft.title,
							traceType: serverDraft.traceType,
							target: serverDraft.target,
							body: serverDraft.body,
							citations: serverDraft.citations
						});
						return;
					}

					// 如果服务器没有，从本地加载
					const localDraft = await loadDraft(draftKey);
					if (localDraft) {
						setFormData({
							title: localDraft.title,
							traceType: localDraft.traceType,
							target: localDraft.target,
							body: localDraft.body,
							citations: localDraft.citations
						});
					}
				} catch (err) {
					console.warn('[TraceEditor] Failed to load draft:', err);
				}
			})();
		}
	}, [traceId, initialData]);

	const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
	const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
	const [hoveredCitationId, setHoveredCitationId] = useState<string | null>(null);

	// 监听文本选择变化
	useEffect(() => {
		const textarea = bodyTextareaRef.current;
		if (!textarea) return;

		const handleSelectionChange = () => {
			if (document.activeElement === textarea) {
				setSelectionRange({
					start: textarea.selectionStart,
					end: textarea.selectionEnd
				});
			}
		};

		// 监听选择事件
		textarea.addEventListener('mouseup', handleSelectionChange);
		textarea.addEventListener('keyup', handleSelectionChange);
		textarea.addEventListener('select', handleSelectionChange);

		return () => {
			textarea.removeEventListener('mouseup', handleSelectionChange);
			textarea.removeEventListener('keyup', handleSelectionChange);
			textarea.removeEventListener('select', handleSelectionChange);
		};
	}, []);

	const handleInsertCitation = (citation: CitationData, index: number) => {
		const citationMark = `[${citation.order || index + 1}]`;
		const textarea = bodyTextareaRef.current;
		
		if (!textarea) {
			// 如果找不到textarea，直接插入到末尾
			setFormData({ ...formData, body: formData.body + ' ' + citationMark });
			return;
		}

		// 获取当前选择位置（优先使用实时选择，否则使用保存的选择范围）
		const currentStart = textarea.selectionStart;
		const currentEnd = textarea.selectionEnd;
		const hasSelection = currentStart !== currentEnd;
		
		let start: number;
		let end: number;
		let selectedText: string;

		if (hasSelection) {
			// 有选中文本，使用当前选择
			start = currentStart;
			end = currentEnd;
			selectedText = formData.body.slice(start, end);
		} else if (selectionRange && selectionRange.start !== selectionRange.end) {
			// 使用保存的选择范围
			start = selectionRange.start;
			end = selectionRange.end;
			selectedText = formData.body.slice(start, end);
		} else {
			// 没有选中文本，插入到光标位置
			start = currentStart;
			end = currentStart;
			selectedText = '';
		}

		// 构建新文本：在选中文本后插入引用标记
		// 如果选中了文本，在文本后添加引用标记；如果没有选中，在光标位置插入
		const text = formData.body;
		let newText: string;
		let newCursorPos: number;

		if (selectedText.trim()) {
			// 有选中文本：在选中文本后添加引用标记
			// 例如："这是选中的文本" -> "这是选中的文本[1]"
			newText = text.slice(0, end) + citationMark + text.slice(end);
			newCursorPos = end + citationMark.length;
		} else {
			// 没有选中文本：在光标位置插入引用标记
			newText = text.slice(0, start) + citationMark + text.slice(start);
			newCursorPos = start + citationMark.length;
		}

		setFormData({ ...formData, body: newText });
		
		// 恢复光标位置和焦点
		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(newCursorPos, newCursorPos);
			setSelectionRange(null); // 清除保存的选择范围
		}, 0);
	};

	const handleSave = async (publish: boolean = false) => {
		try {
			setSaving(true);
			setError(null);
			setConflictWarning(null);

			const payload = {
				...formData,
				citations: formData.citations.map((c, idx) => ({
					...c,
					order: idx + 1
				}))
			};

			let res: Response;
			if (traceId) {
				// 更新（包含版本号用于冲突检测）
				res = await fetch(`/api/traces/${traceId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...payload,
						version // 发送当前版本号
					})
				});
			} else {
				// 创建
				res = await fetch('/api/traces', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			}

			const data = await res.json();

			if (!res.ok) {
				// 检查是否是冲突错误
				if (res.status === 409) {
					setConflictWarning(data.error?.message || '检测到编辑冲突，请刷新页面后重试');
					return;
				}
				throw new Error(data.error?.message || '保存失败');
			}

			const savedTrace = data.data;
			const savedTraceId = savedTrace.id;
			
			// 更新版本号
			if (savedTrace.version) {
				setVersion(savedTrace.version);
			}

			// 清除草稿（本地和服务器）
			const draftKey = traceId ? `trace-draft-${traceId}` : 'trace-draft-new';
			try {
				const { deleteDraft } = await import('@/lib/storage/draftStorage');
				await deleteDraft(draftKey);
			} catch (err) {
				console.warn('[TraceEditor] Failed to delete draft:', err);
			}

			if (publish) {
				// 发布
				const publishRes = await fetch(`/api/traces/${savedTraceId}/publish`, {
					method: 'POST'
				});

				const publishData = await publishRes.json();

				if (!publishRes.ok) {
					throw new Error(publishData.error?.message || '发布失败');
				}

				alert('溯源已发布，AI分析已开始');
				router.push(`/traces/${savedTraceId}`);
			} else {
				alert('保存成功');
				if (!traceId) {
					router.push(`/traces/${savedTraceId}`);
				}
			}
		} catch (err: any) {
			setError(err.message || '保存失败');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div style={{ padding: 'var(--spacing-xl)', maxWidth: 1400, margin: '0 auto' }}>
			{/* 页面头部 */}
			<div 
				className="card-academic" 
				style={{ 
					padding: 'var(--spacing-xl)', 
					marginBottom: 'var(--spacing-lg)',
					background: 'linear-gradient(135deg, var(--color-background-paper) 0%, var(--color-background-subtle) 100%)',
					border: '1px solid var(--color-border-light)',
					borderRadius: 'var(--radius-lg)',
					boxShadow: 'var(--shadow-md)'
				}}
			>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
					<div>
						<h1 style={{ 
							margin: 0, 
							fontSize: 'var(--font-size-2xl)', 
							fontWeight: 700,
							color: 'var(--color-text-primary)',
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-sm)'
						}}>
							<span style={{ width: '6px', height: '32px', background: 'var(--color-primary)', borderRadius: '3px' }}></span>
							{traceId ? '编辑溯源' : '创建溯源'}
						</h1>
						{traceId && version > 0 && (
							<div style={{ 
								marginTop: 'var(--spacing-xs)', 
								fontSize: 'var(--font-size-sm)', 
								color: 'var(--color-text-secondary)' 
							}}>
								版本: {version}
							</div>
						)}
					</div>
					<div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
						<Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
							{saving ? '保存中...' : '保存草稿'}
						</Button>
						<Button variant="primary" onClick={() => handleSave(true)} disabled={saving}>
							{saving ? '保存中...' : '保存并发布'}
						</Button>
					</div>
				</div>
			</div>

			{error && (
				<div
					style={{
						padding: 'var(--spacing-md)',
						background: 'linear-gradient(135deg, var(--color-error) 0%, rgba(244, 67, 54, 0.9) 100%)',
						color: '#fff',
						borderRadius: 'var(--radius-md)',
						marginBottom: 'var(--spacing-lg)',
						border: '1px solid rgba(244, 67, 54, 0.3)',
						boxShadow: 'var(--shadow-sm)',
						fontWeight: 500
					}}
				>
					{error}
				</div>
			)}

			{conflictWarning && (
				<div
					style={{
						padding: 'var(--spacing-md)',
						background: 'linear-gradient(135deg, var(--color-warning) 0%, rgba(255, 193, 7, 0.9) 100%)',
						color: '#fff',
						borderRadius: 'var(--radius-md)',
						marginBottom: 'var(--spacing-lg)',
						border: '1px solid rgba(255, 193, 7, 0.3)',
						boxShadow: 'var(--shadow-sm)',
						fontWeight: 500
					}}
				>
					⚠️ {conflictWarning}
				</div>
			)}

			<div 
				className="card-academic" 
				style={{ 
					padding: 'var(--spacing-xl)', 
					marginBottom: 'var(--spacing-lg)',
					background: 'var(--color-background-paper)',
					border: '1px solid var(--color-border-light)',
					borderRadius: 'var(--radius-lg)',
					boxShadow: 'var(--shadow-sm)'
				}}
			>
				<h2 style={{ 
					marginTop: 0,
					marginBottom: 'var(--spacing-lg)',
					fontSize: 'var(--font-size-xl)',
					fontWeight: 600,
					color: 'var(--color-text-primary)',
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-sm)'
				}}>
					<span style={{ width: '4px', height: '24px', background: 'var(--color-primary)', borderRadius: '2px' }}></span>
					基本信息
				</h2>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
					<div>
						<label style={{ 
							display: 'block', 
							marginBottom: 'var(--spacing-sm)', 
							fontSize: 'var(--font-size-base)', 
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							标题 <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>*</span>
						</label>
						<input
							type="text"
							value={formData.title}
							onChange={(e) => setFormData({ ...formData, title: e.target.value })}
							placeholder="输入溯源标题..."
							style={{
								width: '100%',
								padding: '12px 16px',
								border: '2px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background-paper)',
								color: 'var(--color-text-primary)',
								transition: 'all var(--transition-fast)',
								boxShadow: 'var(--shadow-xs)'
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.1)';
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
							}}
						/>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-lg)' }}>
						<div>
							<label style={{ 
								display: 'block', 
								marginBottom: 'var(--spacing-sm)', 
								fontSize: 'var(--font-size-base)', 
								fontWeight: 600,
								color: 'var(--color-text-primary)'
							}}>
								类型 <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>*</span>
							</label>
							<select
								value={formData.traceType}
								onChange={(e) => setFormData({ ...formData, traceType: e.target.value })}
								style={{
									width: '100%',
									padding: '12px 16px',
									border: '2px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									fontSize: 'var(--font-size-base)',
									background: 'var(--color-background-paper)',
									color: 'var(--color-text-primary)',
									cursor: 'pointer',
									transition: 'all var(--transition-fast)',
									boxShadow: 'var(--shadow-xs)'
								}}
								onFocus={(e) => {
									e.currentTarget.style.borderColor = 'var(--color-primary)';
									e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.1)';
								}}
								onBlur={(e) => {
									e.currentTarget.style.borderColor = 'var(--color-border)';
									e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
								}}
							>
								{typeOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>

						<div>
							<label style={{ 
								display: 'block', 
								marginBottom: 'var(--spacing-sm)', 
								fontSize: 'var(--font-size-base)', 
								fontWeight: 600,
								color: 'var(--color-text-primary)'
							}}>
								溯源目标 <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>*</span>
							</label>
							<input
								type="text"
								value={formData.target}
								onChange={(e) => setFormData({ ...formData, target: e.target.value })}
								placeholder="描述要溯源的内容（至少10字）"
								style={{
									width: '100%',
									padding: '12px 16px',
									border: '2px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									fontSize: 'var(--font-size-base)',
									background: 'var(--color-background-paper)',
									color: 'var(--color-text-primary)',
									transition: 'all var(--transition-fast)',
									boxShadow: 'var(--shadow-xs)'
								}}
								onFocus={(e) => {
									e.currentTarget.style.borderColor = 'var(--color-primary)';
									e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.1)';
								}}
								onBlur={(e) => {
									e.currentTarget.style.borderColor = 'var(--color-border)';
									e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
								}}
							/>
						</div>
					</div>

				</div>
			</div>

			{/* 正文编辑区域 */}
			<div 
				className="card-academic" 
				style={{ 
					padding: 'var(--spacing-xl)', 
					marginBottom: 'var(--spacing-lg)',
					background: 'var(--color-background-paper)',
					border: '1px solid var(--color-border-light)',
					borderRadius: 'var(--radius-lg)',
					boxShadow: 'var(--shadow-sm)'
				}}
			>
				<h2 style={{ 
					marginTop: 0,
					marginBottom: 'var(--spacing-lg)',
					fontSize: 'var(--font-size-xl)',
					fontWeight: 600,
					color: 'var(--color-text-primary)',
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-sm)'
				}}>
					<span style={{ width: '4px', height: '24px', background: 'var(--color-primary)', borderRadius: '2px' }}></span>
					正文内容
				</h2>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
					{/* 编辑区域 */}
					<div>
						<div style={{ 
							marginBottom: 'var(--spacing-sm)', 
							padding: 'var(--spacing-sm) var(--spacing-md)',
							background: 'var(--color-primary-lighter)',
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--font-size-sm)', 
							color: 'var(--color-primary-dark)',
							border: '1px solid var(--color-primary-light)',
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-xs)'
						}}>
							<span style={{ fontSize: 'var(--font-size-base)' }}>💡</span>
							<span>选中文本后，点击引用列表中的"插入引用"按钮，可在选中文本后插入引用标记</span>
						</div>
						<div style={{ position: 'relative' }}>
							<textarea
								ref={bodyTextareaRef}
								name="body"
								value={formData.body}
								onChange={(e) => setFormData({ ...formData, body: e.target.value })}
								onSelect={(e) => {
									const target = e.target as HTMLTextAreaElement;
									setSelectionRange({
										start: target.selectionStart,
										end: target.selectionEnd
									});
								}}
								placeholder="输入正文内容（Markdown格式）...选中文本后点击引用列表的插入引用按钮"
								rows={20}
								style={{
									width: '100%',
									padding: '16px',
									border: '2px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									fontSize: 'var(--font-size-base)',
									fontFamily: 'monospace',
									resize: 'vertical',
									lineHeight: 1.8,
									position: 'relative',
									zIndex: 1,
									background: 'var(--color-background-paper)',
									color: 'var(--color-text-primary)',
									transition: 'all var(--transition-fast)',
									boxShadow: 'var(--shadow-xs)'
								}}
								onFocus={(e) => {
									e.currentTarget.style.borderColor = 'var(--color-primary)';
									e.currentTarget.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.1)';
								}}
								onBlur={(e) => {
									e.currentTarget.style.borderColor = 'var(--color-border)';
									e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
								}}
							/>
							{/* 选中文本的高亮覆盖层 */}
							{selectionRange && selectionRange.start !== selectionRange.end && (
								<div
									style={{
										position: 'absolute',
										top: '12px',
										left: '12px',
										right: '12px',
										bottom: '12px',
										pointerEvents: 'none',
										fontSize: 'var(--font-size-base)',
										fontFamily: 'monospace',
										lineHeight: 1.6,
										whiteSpace: 'pre-wrap',
										overflow: 'hidden',
										zIndex: 0
									}}
								>
									<span style={{ color: 'transparent' }}>
										{formData.body.slice(0, selectionRange.start)}
									</span>
									<span
										style={{
											background: 'rgba(33, 150, 243, 0.12)',
											borderRadius: '2px',
											padding: '0 1px',
											borderBottom: '1.5px solid rgba(33, 150, 243, 0.3)',
											color: 'transparent'
										}}
									>
										{formData.body.slice(selectionRange.start, selectionRange.end)}
									</span>
									<span style={{ color: 'transparent' }}>
										{formData.body.slice(selectionRange.end)}
									</span>
								</div>
							)}
						</div>
						<div style={{ 
							fontSize: 'var(--font-size-sm)', 
							color: 'var(--color-text-secondary)', 
							marginTop: 'var(--spacing-sm)',
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-md)'
						}}>
							<span>字数: <strong style={{ color: 'var(--color-text-primary)' }}>{formData.body.length}</strong> / 50000</span>
							{selectionRange && selectionRange.start !== selectionRange.end && (
								<span style={{ 
									color: 'var(--color-primary)', 
									fontWeight: 600,
									display: 'inline-flex',
									alignItems: 'center',
									gap: 'var(--spacing-xs)'
								}}>
									<span>✓</span>
									<span>已选中 {selectionRange.end - selectionRange.start} 个字符</span>
								</span>
							)}
						</div>
					</div>
					{/* 预览区域 */}
					<div>
						<div style={{ 
							marginBottom: 'var(--spacing-sm)',
							fontSize: 'var(--font-size-sm)',
							color: 'var(--color-text-secondary)',
							fontWeight: 500
						}}>
							实时预览
						</div>
						<div
							style={{
								position: 'relative',
								padding: '16px',
								border: '2px solid var(--color-border-light)',
								borderRadius: 'var(--radius-md)',
								background: 'var(--color-background-subtle)',
								minHeight: '400px',
								maxHeight: '500px',
								overflow: 'auto',
								fontSize: 'var(--font-size-base)',
								lineHeight: 1.8,
								whiteSpace: 'pre-wrap',
								boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.02)'
							}}
						>
							{formData.body ? (
										<>
											<CitationRenderer
												body={formData.body}
												citations={formData.citations.map((c, idx) => ({
													id: c.id || `temp-${idx}`,
													order: c.order || idx + 1,
													title: c.title,
													url: c.url
												}))}
												onCitationClick={(citationId, order) => {
													// 在引用管理区域高亮对应的引用
													const citationElement = document.getElementById(`citation-item-${citationId}`);
													if (citationElement) {
														citationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
														citationElement.style.border = '2px solid var(--color-primary)';
														setTimeout(() => {
															citationElement.style.border = '1px solid var(--color-border)';
														}, 2000);
													}
												}}
												onCitationHover={(citationId) => {
													setHoveredCitationId(citationId);
												}}
												editable={true}
											/>
											{/* 在预览区域也高亮显示选中的文本 */}
											{selectionRange && selectionRange.start !== selectionRange.end && (
												<div
													style={{
														position: 'absolute',
														top: '12px',
														left: '12px',
														right: '12px',
														bottom: '12px',
														pointerEvents: 'none',
														fontSize: 'var(--font-size-base)',
														lineHeight: 1.8,
														whiteSpace: 'pre-wrap',
														overflow: 'hidden'
													}}
												>
													<span style={{ color: 'transparent' }}>
														{formData.body.slice(0, selectionRange.start).split('\n').map((line, idx, lines) => (
															<span key={idx}>
																{line}
																{idx < lines.length - 1 && <br />}
															</span>
														))}
													</span>
													<span
														style={{
															background: 'rgba(33, 150, 243, 0.15)',
															borderRadius: '3px',
															padding: '1px 2px',
															borderBottom: '2px solid rgba(33, 150, 243, 0.35)',
															color: 'transparent',
															display: 'inline-block'
														}}
													>
														{formData.body.slice(selectionRange.start, selectionRange.end)}
													</span>
													<span style={{ color: 'transparent' }}>
														{formData.body.slice(selectionRange.end).split('\n').map((line, idx, lines) => (
															<span key={idx}>
																{line}
																{idx < lines.length - 1 && <br />}
															</span>
														))}
													</span>
												</div>
											)}
										</>
									) : (
										<div style={{ 
											color: 'var(--color-text-tertiary)', 
											fontStyle: 'italic',
											textAlign: 'center',
											padding: 'var(--spacing-xl)'
										}}>
											预览将在这里显示，引用标记会高亮显示
										</div>
									)}
						</div>
					</div>
				</div>
			</div>

			{/* 引用管理区域 */}
			<div 
				className="card-academic" 
				style={{ 
					padding: 'var(--spacing-xl)',
					background: 'var(--color-background-paper)',
					border: '1px solid var(--color-border-light)',
					borderRadius: 'var(--radius-lg)',
					boxShadow: 'var(--shadow-sm)'
				}}
			>
				<CitationManager
					citations={formData.citations}
					onChange={(citations) => setFormData({ ...formData, citations })}
					onInsert={handleInsertCitation}
					hoveredCitationId={hoveredCitationId}
				/>
			</div>
		</div>
	);
}

