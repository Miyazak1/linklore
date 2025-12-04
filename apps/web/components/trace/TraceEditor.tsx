'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import CitationManager, { type CitationData } from './CitationManager';
import CitationRenderer from './CitationRenderer';

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
		<div style={{ padding: 'var(--spacing-xl)', maxWidth: '1200px', margin: '0 auto' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
				<h1>{traceId ? '编辑溯源' : '创建溯源'}</h1>
				<div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
					<Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
						{saving ? '保存中...' : '保存草稿'}
					</Button>
					<Button variant="primary" onClick={() => handleSave(true)} disabled={saving}>
						{saving ? '保存中...' : '保存并发布'}
					</Button>
				</div>
			</div>

			{error && (
				<div
					style={{
						padding: 'var(--spacing-md)',
						background: 'var(--color-error)',
						color: '#fff',
						borderRadius: 'var(--radius-md)',
						marginBottom: 'var(--spacing-lg)'
					}}
				>
					{error}
				</div>
			)}

			<div className="card-academic" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
					<div>
						<label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
							标题 <span style={{ color: 'var(--color-error)' }}>*</span>
						</label>
						<input
							type="text"
							value={formData.title}
							onChange={(e) => setFormData({ ...formData, title: e.target.value })}
							placeholder="溯源标题"
							style={{
								width: '100%',
								padding: '8px 12px',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)'
							}}
						/>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-md)' }}>
						<div>
							<label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
								类型 <span style={{ color: 'var(--color-error)' }}>*</span>
							</label>
							<select
								value={formData.traceType}
								onChange={(e) => setFormData({ ...formData, traceType: e.target.value })}
								style={{
									width: '100%',
									padding: '8px 12px',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									fontSize: 'var(--font-size-base)'
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
							<label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
								溯源目标 <span style={{ color: 'var(--color-error)' }}>*</span>
							</label>
							<input
								type="text"
								value={formData.target}
								onChange={(e) => setFormData({ ...formData, target: e.target.value })}
								placeholder="溯源目标描述（至少10字）"
								style={{
									width: '100%',
									padding: '8px 12px',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									fontSize: 'var(--font-size-base)'
								}}
							/>
						</div>
					</div>

					<div>
						<label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
							正文 <span style={{ color: 'var(--color-error)' }}>*</span>
						</label>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
							{/* 编辑区域 */}
							<div>
								<div style={{ marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
									💡 提示：选中文本后，点击引用列表中的"插入引用"按钮，可在选中文本后插入引用标记
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
											padding: '12px',
											border: '1px solid var(--color-border)',
											borderRadius: 'var(--radius-md)',
											fontSize: 'var(--font-size-base)',
											fontFamily: 'monospace',
											resize: 'vertical',
											lineHeight: 1.6,
											position: 'relative',
											zIndex: 1,
											background: selectionRange && selectionRange.start !== selectionRange.end 
												? 'var(--color-background-paper)' 
												: 'var(--color-background-paper)'
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
								<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
									字数: {formData.body.length} / 50000
									{selectionRange && selectionRange.start !== selectionRange.end && (
										<span style={{ marginLeft: 'var(--spacing-sm)', color: 'var(--color-primary)', fontWeight: 500 }}>
											✓ 已选中 {selectionRange.end - selectionRange.start} 个字符
										</span>
									)}
								</div>
							</div>
							{/* 预览区域 */}
							<div>
								<div
									style={{
										position: 'relative',
										padding: '12px',
										border: '1px solid var(--color-border)',
										borderRadius: 'var(--radius-md)',
										background: 'var(--color-background-paper)',
										minHeight: '400px',
										maxHeight: '500px',
										overflow: 'auto',
										fontSize: 'var(--font-size-base)',
										lineHeight: 1.8,
										whiteSpace: 'pre-wrap'
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
										<div style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
											预览将在这里显示，引用标记会高亮显示
										</div>
									)}
								</div>
								<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
									实时预览
									{selectionRange && selectionRange.start !== selectionRange.end && (
										<span style={{ marginLeft: 'var(--spacing-sm)', color: 'var(--color-primary)' }}>
											• 选中文本已高亮
										</span>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="card-academic" style={{ padding: 'var(--spacing-lg)' }}>
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

