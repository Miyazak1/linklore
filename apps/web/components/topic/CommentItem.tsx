'use client';

import { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import Avatar from '@/components/ui/Avatar';


interface Comment {
	id: string;
	parentId: string | null;
	authorId: string;
	author: {
		id: string;
		email: string;
		name: string | null;
		avatarUrl?: string | null;
	};
	content: string;
	depth: number;
	createdAt: string;
	updatedAt: string;
	floor?: number; // 楼层号
	parentAuthor?: { name: string | null; email: string }; // 父评论作者（用于显示"回复 @用户名"）
	replies?: Comment[]; // 子评论（前端构建）
}

interface CommentItemProps {
	comment: Comment;
	currentUserId?: string;
	onReply?: (parentId: string, content: string) => void;
	onEdit?: (commentId: string, content: string) => void;
	onDelete?: (commentId: string) => void;
	maxVisibleDepth?: number; // 默认显示的最大深度
}

/**
 * 单个评论项组件
 * 支持递归渲染子评论
 */
export default function CommentItem({
	comment,
	currentUserId,
	onReply,
	onEdit,
	onDelete,
	maxVisibleDepth = 3
}: CommentItemProps) {
	const [isExpanded, setIsExpanded] = useState(comment.depth < maxVisibleDepth);
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState(comment.content);
	const [showReplies, setShowReplies] = useState(true);
	const [isReplying, setIsReplying] = useState(false);
	const [replyContent, setReplyContent] = useState('');
	const [submittingReply, setSubmittingReply] = useState(false);
	const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
	const editTextareaRef = useRef<HTMLTextAreaElement>(null);
	const commentRef = useRef<HTMLDivElement>(null);

	const isAuthor = currentUserId === comment.authorId;
	const hasReplies = Array.isArray(comment.replies) && comment.replies.length > 0;
	const isDeep = comment.depth >= maxVisibleDepth;
	const shouldCollapse = comment.depth >= maxVisibleDepth && !isExpanded;

	// 自动聚焦输入框
	useEffect(() => {
		if (isReplying && replyTextareaRef.current) {
			replyTextareaRef.current.focus();
		}
	}, [isReplying]);

	useEffect(() => {
		if (isEditing && editTextareaRef.current) {
			editTextareaRef.current.focus();
		}
	}, [isEditing]);

	// 计算缩进和连接线样式
	const indentLevel = Math.min(comment.depth, 5);
	const hasParent = comment.depth > 0;
	const indentStyle = {
		marginLeft: hasParent ? `${Math.min(comment.depth, 5) * 28}px` : '0',
		paddingLeft: comment.depth > 5 ? '16px' : hasParent ? '16px' : '0',
		borderLeft: hasParent && comment.depth <= 5 ? '3px solid var(--color-primary-lighter)' : 'none',
		position: 'relative' as const,
		paddingTop: hasParent ? 'var(--spacing-sm)' : '0'
	};

	const handleSaveEdit = async () => {
		if (editContent.trim() === '') return;
		if (onEdit) {
			await onEdit(comment.id, editContent);
			setIsEditing(false);
		}
	};

	const handleDelete = async () => {
		if (confirm('确定要删除这条评论吗？')) {
			if (onDelete) {
				await onDelete(comment.id);
			}
		}
	};

	const handleSubmitReply = async () => {
		if (!replyContent.trim()) {
			return;
		}

		if (onReply) {
			try {
				setSubmittingReply(true);
				await onReply(comment.id, replyContent.trim());
				setReplyContent('');
				setIsReplying(false);
			} catch (err) {
				console.error('[CommentItem] Reply failed:', err);
			} finally {
				setSubmittingReply(false);
			}
		}
	};

	// 键盘快捷键：Ctrl+Enter 提交
	const handleKeyDown = (e: React.KeyboardEvent, onSubmit: () => void) => {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			onSubmit();
		}
	};

	// 格式化时间显示
	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (seconds < 60) return '刚刚';
		if (minutes < 60) return `${minutes}分钟前`;
		if (hours < 24) return `${hours}小时前`;
		if (days < 7) return `${days}天前`;
		return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
	};

	// Markdown 渲染（使用 marked 库）
	const renderContent = (text: string) => {
		try {
			// 配置 marked 选项（安全渲染）
			marked.setOptions({
				breaks: true, // 支持 GitHub 风格的换行
				gfm: true, // 支持 GitHub Flavored Markdown
			});

			// 渲染 Markdown
			const html = marked.parse(text) as string;
			
			// 添加样式
			return {
				__html: `<style>
					.comment-content p { margin: 0.5em 0; }
					.comment-content ul, .comment-content ol { margin: 0.5em 0; padding-left: 1.5em; }
					.comment-content li { margin: 0.25em 0; }
					.comment-content blockquote { border-left: 3px solid var(--color-border); padding-left: 1em; margin: 0.5em 0; color: var(--color-text-secondary); font-style: italic; }
					.comment-content code { background: var(--color-background-subtle); padding: 2px 4px; border-radius: 3px; font-family: var(--font-family-mono); font-size: 0.9em; }
					.comment-content pre { background: var(--color-background-subtle); padding: 0.5em; border-radius: 4px; overflow-x: auto; margin: 0.5em 0; }
					.comment-content pre code { background: none; padding: 0; }
					.comment-content a { color: var(--color-primary); text-decoration: none; }
					.comment-content a:hover { text-decoration: underline; }
					.comment-content strong { font-weight: 600; }
					.comment-content em { font-style: italic; }
					.comment-content h1, .comment-content h2, .comment-content h3 { margin: 0.5em 0; font-weight: 600; }
					.comment-content h1 { font-size: 1.5em; }
					.comment-content h2 { font-size: 1.3em; }
					.comment-content h3 { font-size: 1.1em; }
				</style>
				<div class="comment-content">${html}</div>`
			};
		} catch (err) {
			// 如果 Markdown 解析失败，回退到简单转义
			const escaped = text
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#039;');
			const withBreaks = escaped.replace(/\n/g, '<br>');
			return { __html: withBreaks };
		}
	};

	// 跳转到指定楼层
	const scrollToFloor = (floor: number) => {
		const targetComment = document.querySelector(`[data-comment-floor="${floor}"]`);
		if (targetComment) {
			targetComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
			// 高亮显示
			(targetComment as HTMLElement).style.background = 'var(--color-primary-lighter)';
			setTimeout(() => {
				(targetComment as HTMLElement).style.background = hasParent 
					? 'var(--color-background-subtle)' 
					: 'var(--color-background-paper)';
			}, 2000);
		}
	};

	return (
		<div
			ref={commentRef}
			data-comment-id={comment.id}
			data-comment-floor={comment.floor}
			style={{
				...indentStyle,
				marginBottom: hasParent ? 'var(--spacing-sm)' : 'var(--spacing-md)',
				padding: 'var(--spacing-md)',
				background: hasParent ? 'var(--color-background-subtle)' : 'var(--color-background-paper)',
				border: hasParent 
					? `1px solid var(--color-primary-lighter)` 
					: '1px solid var(--color-border)',
				borderRadius: 'var(--radius-md)',
				transition: 'all var(--transition-fast)',
				position: 'relative'
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.borderColor = 'var(--color-primary)';
				e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
				if (hasParent) {
					e.currentTarget.style.background = 'var(--color-background-paper)';
				}
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.borderColor = hasParent 
					? 'var(--color-primary-lighter)' 
					: 'var(--color-border)';
				e.currentTarget.style.boxShadow = 'none';
				if (hasParent) {
					e.currentTarget.style.background = 'var(--color-background-subtle)';
				}
			}}
		>
			{/* 回复连接线（如果有父评论） */}
			{hasParent && comment.depth <= 5 && (
				<>
					{/* 垂直连接线 */}
					<div style={{
						position: 'absolute',
						left: `${(Math.min(comment.depth, 5) - 1) * 28 + 6}px`,
						top: '-16px',
						width: '3px',
						height: '16px',
						background: 'var(--color-primary-lighter)',
						borderRadius: '2px 2px 0 0'
					}} />
					{/* 水平连接线 */}
					<div style={{
						position: 'absolute',
						left: `${(Math.min(comment.depth, 5) - 1) * 28 + 6}px`,
						top: '0',
						width: '12px',
						height: '3px',
						background: 'var(--color-primary-lighter)',
						borderRadius: '0 0 2px 0'
					}} />
				</>
			)}

			{/* 评论头部 */}
			<div style={{ 
				display: 'flex', 
				justifyContent: 'space-between', 
				alignItems: 'start', 
				marginBottom: 'var(--spacing-sm)',
				gap: 'var(--spacing-sm)'
			}}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1 }}>
					<Avatar
						avatarUrl={comment.author.avatarUrl}
						name={comment.author.name}
						email={comment.author.email}
						size={hasParent ? 28 : 32}
						style={{ flexShrink: 0 }}
					/>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ 
							display: 'flex', 
							alignItems: 'center', 
							gap: 'var(--spacing-xs)',
							flexWrap: 'wrap'
						}}>
							{/* 楼层号 */}
							{comment.floor && (
								<button
									onClick={() => scrollToFloor(comment.floor!)}
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										minWidth: '32px',
										height: '20px',
										padding: '0 6px',
										background: hasParent ? 'var(--color-primary-lighter)' : 'var(--color-primary)',
										color: hasParent ? 'var(--color-primary)' : 'white',
										border: 'none',
										borderRadius: 'var(--radius-sm)',
										fontSize: 'var(--font-size-xs)',
										fontWeight: 600,
										flexShrink: 0,
										cursor: 'pointer',
										transition: 'all var(--transition-fast)'
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.opacity = '0.8';
										e.currentTarget.style.transform = 'scale(1.05)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.opacity = '1';
										e.currentTarget.style.transform = 'scale(1)';
									}}
									title={`楼层 #${comment.floor}`}
								>
									#{comment.floor}
								</button>
							)}
							{/* 回复标识 */}
							{hasParent && comment.parentAuthor && (
								<span style={{
									fontSize: 'var(--font-size-xs)',
									color: 'var(--color-primary)',
									fontWeight: 500
								}}>
									回复 @{comment.parentAuthor.name || comment.parentAuthor.email}
								</span>
							)}
							<span style={{ 
								fontWeight: 600, 
								color: 'var(--color-text-primary)',
								fontSize: hasParent ? 'var(--font-size-xs)' : 'var(--font-size-sm)'
							}}>
								{comment.author.name || comment.author.email}
							</span>
							<span style={{ 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--color-text-tertiary)'
							}}>
								{formatTime(comment.createdAt)}
							</span>
							{comment.updatedAt !== comment.createdAt && (
								<span style={{ 
									fontSize: 'var(--font-size-xs)', 
									color: 'var(--color-text-tertiary)', 
									fontStyle: 'italic'
								}}>
									(已编辑)
								</span>
							)}
						</div>
					</div>
				</div>
				<div style={{ 
					display: 'flex', 
					gap: 'var(--spacing-xs)',
					flexShrink: 0
				}}>
					{isAuthor && !isEditing && (
						<>
							<button
								onClick={() => setIsEditing(true)}
								style={{
									padding: '4px 8px',
									fontSize: 'var(--font-size-xs)',
									border: 'none',
									background: 'transparent',
									color: 'var(--color-primary)',
									cursor: 'pointer',
									borderRadius: 'var(--radius-sm)',
									transition: 'all var(--transition-fast)'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = 'var(--color-background-subtle)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = 'transparent';
								}}
							>
								编辑
							</button>
							<button
								onClick={handleDelete}
								style={{
									padding: '4px 8px',
									fontSize: 'var(--font-size-xs)',
									border: 'none',
									background: 'transparent',
									color: 'var(--color-error)',
									cursor: 'pointer',
									borderRadius: 'var(--radius-sm)',
									transition: 'all var(--transition-fast)'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = 'rgba(198, 40, 40, 0.1)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = 'transparent';
								}}
							>
								删除
							</button>
						</>
					)}
					{onReply && currentUserId && !isEditing && (
						<button
							onClick={() => setIsReplying(!isReplying)}
							style={{
								padding: '4px 8px',
								fontSize: 'var(--font-size-xs)',
								border: 'none',
								background: isReplying ? 'var(--color-background-subtle)' : 'transparent',
								color: 'var(--color-primary)',
								cursor: 'pointer',
								borderRadius: 'var(--radius-sm)',
								transition: 'all var(--transition-fast)',
								fontWeight: isReplying ? 600 : 400
							}}
							onMouseEnter={(e) => {
								if (!isReplying) {
									e.currentTarget.style.background = 'var(--color-background-subtle)';
								}
							}}
							onMouseLeave={(e) => {
								if (!isReplying) {
									e.currentTarget.style.background = 'transparent';
								}
							}}
						>
							{isReplying ? '取消回复' : '回复'}
						</button>
					)}
				</div>
			</div>

			{/* 评论内容 */}
			{isEditing ? (
				<div>
					<textarea
						ref={editTextareaRef}
						value={editContent}
						onChange={(e) => {
							setEditContent(e.target.value);
							const length = e.target.value.length;
							const counter = document.getElementById(`edit-length-counter-${comment.id}`);
							if (counter) {
								counter.textContent = `${length}/5000`;
								counter.style.color = length > 4500 ? 'var(--color-error)' : 
									length > 4000 ? 'var(--color-warning)' : 'var(--color-text-secondary)';
							}
						}}
						maxLength={5000}
						placeholder="编辑评论...（支持 Markdown 格式）"
						onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
						style={{
							width: '100%',
							minHeight: '100px',
							padding: 'var(--spacing-sm)',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--font-size-base)',
							fontFamily: 'inherit',
							resize: 'vertical',
							marginBottom: 'var(--spacing-xs)',
							transition: 'border-color var(--transition-fast)'
						}}
						onFocus={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-primary)';
							e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-lighter)';
						}}
						onBlur={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border)';
							e.currentTarget.style.boxShadow = 'none';
						}}
					/>
					<div style={{ 
						display: 'flex', 
						justifyContent: 'space-between', 
						alignItems: 'center',
						marginBottom: 'var(--spacing-sm)'
					}}>
						<span 
							id={`edit-length-counter-${comment.id}`}
							style={{ 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--color-text-secondary)'
							}}
						>
							{editContent.length}/5000
						</span>
						<span style={{ 
							fontSize: 'var(--font-size-xs)', 
							color: 'var(--color-text-tertiary)'
						}}>
							支持 Markdown 格式
						</span>
					</div>
					<div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
						<button
							onClick={handleSaveEdit}
							disabled={!editContent.trim()}
							style={{
								padding: '6px 12px',
								background: 'var(--color-primary)',
								color: 'white',
								border: 'none',
								borderRadius: 'var(--radius-sm)',
								cursor: editContent.trim() ? 'pointer' : 'not-allowed',
								opacity: editContent.trim() ? 1 : 0.6,
								fontSize: 'var(--font-size-sm)',
								fontWeight: 500,
								transition: 'all var(--transition-fast)'
							}}
							onMouseEnter={(e) => {
								if (editContent.trim()) {
									e.currentTarget.style.opacity = '0.9';
									e.currentTarget.style.transform = 'translateY(-1px)';
								}
							}}
							onMouseLeave={(e) => {
								if (editContent.trim()) {
									e.currentTarget.style.opacity = '1';
									e.currentTarget.style.transform = 'translateY(0)';
								}
							}}
						>
							保存
						</button>
						<button
							onClick={() => {
								setIsEditing(false);
								setEditContent(comment.content);
							}}
							style={{
								padding: '6px 12px',
								background: 'var(--color-background-paper)',
								color: 'var(--color-text-primary)',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-sm)',
								cursor: 'pointer',
								fontSize: 'var(--font-size-sm)',
								transition: 'all var(--transition-fast)'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'var(--color-background-subtle)';
								e.currentTarget.style.borderColor = 'var(--color-border-light)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'var(--color-background-paper)';
								e.currentTarget.style.borderColor = 'var(--color-border)';
							}}
						>
							取消
						</button>
						<span style={{
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-tertiary)',
							marginLeft: 'var(--spacing-xs)'
						}}>
							Ctrl+Enter 提交
						</span>
					</div>
				</div>
			) : (
				<div
					style={{
						color: 'var(--color-text-primary)',
						lineHeight: 'var(--line-height-relaxed)',
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
						fontSize: hasParent ? 'var(--font-size-sm)' : 'var(--font-size-base)'
					}}
					dangerouslySetInnerHTML={renderContent(comment.content)}
				/>
			)}

			{/* 回复输入框 - 显示在同一层 */}
			{isReplying && currentUserId && (
				<div style={{
					marginTop: 'var(--spacing-md)',
					padding: 'var(--spacing-md)',
					background: 'var(--color-background-subtle)',
					borderRadius: 'var(--radius-sm)',
					border: '1px solid var(--color-border)',
					animation: 'fadeIn 0.2s ease-out'
				}}>
					<textarea
						ref={replyTextareaRef}
						value={replyContent}
						onChange={(e) => {
							setReplyContent(e.target.value);
							const length = e.target.value.length;
							const counter = document.getElementById(`reply-length-counter-${comment.id}`);
							if (counter) {
								counter.textContent = `${length}/5000`;
								counter.style.color = length > 4500 ? 'var(--color-error)' : 
									length > 4000 ? 'var(--color-warning)' : 'var(--color-text-secondary)';
							}
						}}
						placeholder="回复评论...（支持 Markdown 格式）"
						maxLength={5000}
						onKeyDown={(e) => handleKeyDown(e, handleSubmitReply)}
						style={{
							width: '100%',
							minHeight: '80px',
							padding: 'var(--spacing-sm)',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--font-size-base)',
							fontFamily: 'inherit',
							resize: 'vertical',
							marginBottom: 'var(--spacing-xs)',
							transition: 'border-color var(--transition-fast)'
						}}
						onFocus={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-primary)';
							e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-lighter)';
						}}
						onBlur={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border)';
							e.currentTarget.style.boxShadow = 'none';
						}}
					/>
					<div style={{ 
						display: 'flex', 
						justifyContent: 'space-between', 
						alignItems: 'center',
						marginBottom: 'var(--spacing-sm)'
					}}>
						<span 
							id={`reply-length-counter-${comment.id}`}
							style={{ 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--color-text-secondary)'
							}}
						>
							{replyContent.length}/5000
						</span>
						<span style={{ 
							fontSize: 'var(--font-size-xs)', 
							color: 'var(--color-text-tertiary)'
						}}>
							支持 Markdown 格式
						</span>
					</div>
					<div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
						<button
							onClick={handleSubmitReply}
							disabled={submittingReply || !replyContent.trim()}
							style={{
								padding: '6px 12px',
								background: 'var(--color-primary)',
								color: 'white',
								border: 'none',
								borderRadius: 'var(--radius-sm)',
								cursor: (submittingReply || !replyContent.trim()) ? 'not-allowed' : 'pointer',
								opacity: (submittingReply || !replyContent.trim()) ? 0.6 : 1,
								fontSize: 'var(--font-size-sm)',
								fontWeight: 500,
								transition: 'all var(--transition-fast)'
							}}
							onMouseEnter={(e) => {
								if (!submittingReply && replyContent.trim()) {
									e.currentTarget.style.opacity = '0.9';
									e.currentTarget.style.transform = 'translateY(-1px)';
								}
							}}
							onMouseLeave={(e) => {
								if (!submittingReply && replyContent.trim()) {
									e.currentTarget.style.opacity = '1';
									e.currentTarget.style.transform = 'translateY(0)';
								}
							}}
						>
							{submittingReply ? '提交中...' : '回复'}
						</button>
						<button
							onClick={() => {
								setIsReplying(false);
								setReplyContent('');
							}}
							style={{
								padding: '6px 12px',
								background: 'var(--color-background-paper)',
								color: 'var(--color-text-primary)',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-sm)',
								cursor: 'pointer',
								fontSize: 'var(--font-size-sm)',
								transition: 'all var(--transition-fast)'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'var(--color-background-subtle)';
								e.currentTarget.style.borderColor = 'var(--color-border-light)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'var(--color-background-paper)';
								e.currentTarget.style.borderColor = 'var(--color-border)';
							}}
						>
							取消
						</button>
						<span style={{
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-tertiary)',
							marginLeft: 'var(--spacing-xs)'
						}}>
							Ctrl+Enter 提交
						</span>
					</div>
				</div>
			)}

			{/* 子评论 */}
			{hasReplies && (
				<div style={{ 
					marginTop: 'var(--spacing-md)',
					position: 'relative'
				}}>
					{/* 子评论连接线 */}
					{!shouldCollapse && comment.depth < 5 && (
						<div style={{
							position: 'absolute',
							left: `${(Math.min(comment.depth, 5)) * 28 + 6}px`,
							top: '0',
							width: '3px',
							height: '100%',
							background: 'var(--color-primary-lighter)',
							opacity: 0.3
						}} />
					)}
					{shouldCollapse ? (
						<button
							onClick={() => setIsExpanded(true)}
							style={{
								padding: '6px 12px',
								fontSize: 'var(--font-size-sm)',
								background: 'var(--color-background-subtle)',
								color: 'var(--color-primary)',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-sm)',
								cursor: 'pointer',
								transition: 'all var(--transition-fast)',
								fontWeight: 500
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'var(--color-background-paper)';
								e.currentTarget.style.borderColor = 'var(--color-primary)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'var(--color-background-subtle)';
								e.currentTarget.style.borderColor = 'var(--color-border)';
							}}
						>
							展开更多回复 ({Array.isArray(comment.replies) ? comment.replies.length : 0} 条)
						</button>
					) : (
						<div style={{ position: 'relative' }}>
							{showReplies && Array.isArray(comment.replies) && comment.replies.map((reply: Comment) => (
								<CommentItem
									key={reply.id}
									comment={reply}
									currentUserId={currentUserId}
									onReply={onReply}
									onEdit={onEdit}
									onDelete={onDelete}
									maxVisibleDepth={maxVisibleDepth}
								/>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

