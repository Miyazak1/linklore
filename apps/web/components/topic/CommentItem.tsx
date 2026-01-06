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
	parentAuthor?: { name: string | null; email: string }; // 父评论作者（用于显示"回复 @用户名"）
}

interface CommentItemProps {
	comment: Comment;
	currentUserId?: string;
	onReply?: (parentId: string, content: string) => void;
	onDelete?: (commentId: string) => void;
	allComments?: Comment[]; // 所有评论的扁平数组（用于筛选直接回复）
}

/**
 * 单个评论项组件
 * 扁平显示：不递归渲染，只显示直接回复
 */
export default function CommentItem({
	comment,
	currentUserId,
	onReply,
	onDelete,
	allComments = []
}: CommentItemProps) {
	const [isReplying, setIsReplying] = useState(false);
	const [replyContent, setReplyContent] = useState('');
	const [submittingReply, setSubmittingReply] = useState(false);
	const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
	const commentRef = useRef<HTMLDivElement>(null);

	const isAuthor = currentUserId === comment.authorId;
	
	// 扁平结构：所有评论都在TopicComments中统一渲染，这里不需要处理回复显示

	// 自动聚焦输入框
	useEffect(() => {
		if (isReplying && replyTextareaRef.current) {
			replyTextareaRef.current.focus();
		}
	}, [isReplying]);


	// 计算缩进和连接线样式
	const indentLevel = Math.min(comment.depth, 5);
	const hasParent = comment.parentId !== null; // 基于parentId判断，而不是depth
	
	// 根据层级设置不同的背景色（参考图：根评论和所有回复有区分）
	const getBackgroundByDepth = (hasParent: boolean): string => {
		// 统一背景：所有评论都用极浅灰
		return 'rgba(0, 0, 0, 0.02)';
	};
	
	const getBorderColorByDepth = (hasParent: boolean): string => {
		if (!hasParent) {
			return 'var(--color-border)';
		} else {
			// 所有回复使用相同的边框颜色
			return 'rgba(25, 118, 210, 0.15)';
		}
	};
	
	// 扁平结构：所有2级评论（parentId !== null）都使用相同的缩进，不管它们的depth值是什么
	// 根评论（parentId === null）不缩进，所有2级评论（parentId !== null）都缩进相同距离
	const shouldIndent = comment.parentId !== null; // 所有2级评论都缩进相同距离
	const indentStyle = {
		marginLeft: shouldIndent ? '24px' : '0', // 增加缩进，从16px改为24px
		paddingLeft: shouldIndent ? '16px' : '0', // 增加内边距，从12px改为16px
		borderLeft: shouldIndent 
			? `2px solid ${getBorderColorByDepth(true)}` 
			: 'none',
		position: 'relative' as const,
		paddingTop: shouldIndent ? 'var(--spacing-xs)' : '0'
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


		const baseBackground = getBackgroundByDepth(hasParent);
		const baseBorderColor = getBorderColorByDepth(hasParent);
		
		return (
		<div
			ref={commentRef}
			data-comment-id={comment.id}
			data-comment-depth={comment.depth}
			data-comment-parent-id={comment.parentId || ''}
			style={{
				...indentStyle,
				marginBottom: hasParent ? 'var(--spacing-sm)' : 'var(--spacing-md)',
				padding: 'var(--spacing-md)',
				background: baseBackground,
				border: 'none', // 移除边框
				borderRadius: 'var(--radius-md)',
				transition: 'all var(--transition-fast)',
				position: 'relative'
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
				// hover 时稍微提亮背景
				if (hasParent) {
					e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
				} else {
					e.currentTarget.style.background = 'rgba(0, 0, 0, 0.015)';
				}
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.boxShadow = 'none';
				e.currentTarget.style.background = baseBackground;
			}}
		>
			{/* 扁平结构：不显示连接线，所有2级评论都扁平显示 */}

			{/* 评论头部 */}
			<div style={{ 
				display: 'flex', 
				justifyContent: 'space-between', 
				alignItems: 'start', 
				marginBottom: 'var(--spacing-sm)',
				gap: 'var(--spacing-sm)'
			}}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1 }}>
					{/* 头像 */}
					<Avatar
						avatarUrl={comment.author.avatarUrl}
						name={comment.author.name}
						email={comment.author.email}
						size={hasParent ? 28 : 32}
						style={{ flexShrink: 0 }}
					/>
					{/* 昵称和其他信息 */}
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ 
							display: 'flex', 
							alignItems: 'center', 
							gap: 'var(--spacing-xs)',
							flexWrap: 'wrap'
						}}>
							<span style={{ 
								fontWeight: 600, 
								color: 'var(--color-text-primary)',
								fontSize: hasParent ? 'var(--font-size-xs)' : 'var(--font-size-sm)'
							}}>
								{comment.author.name || comment.author.email}
							</span>
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
						</div>
					</div>
				</div>
				{/* 删除按钮 - 仅作者可见 */}
				{isAuthor && (
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
							transition: 'all var(--transition-fast)',
							flexShrink: 0
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
				)}
			</div>

			{/* 评论内容 */}
			<div
				style={{
					color: 'var(--color-text-primary)',
					lineHeight: 'var(--line-height-relaxed)',
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
					fontSize: hasParent ? 'var(--font-size-sm)' : 'var(--font-size-base)',
					marginBottom: 'var(--spacing-sm)'
				}}
				dangerouslySetInnerHTML={renderContent(comment.content)}
			/>

			{/* 时间和回复按钮 - 放在评论内容下面 */}
			<div style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				gap: 'var(--spacing-sm)',
				flexWrap: 'wrap'
			}}>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-xs)',
					flexWrap: 'wrap'
				}}>
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
				{onReply && currentUserId && (
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

			{/* 扁平结构：所有评论都在TopicComments中统一渲染，这里不渲染回复 */}
		</div>
	);
}

