'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CommentItem from './CommentItem';

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
	replies?: Comment[];
}

interface TopicCommentsProps {
	topicId: string;
	currentUserId?: string;
}

/**
 * 话题评论组件
 * 包含评论列表和评论输入
 */
export default function TopicComments({ topicId, currentUserId: propCurrentUserId, initialComments }: TopicCommentsProps) {
	const { user: authUser } = useAuth(); // 使用AuthContext获取用户信息
	const [comments, setComments] = useState<Comment[]>([]);
	const [loading, setLoading] = useState(!initialComments); // 如果有初始数据，不需要loading
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	// 优先使用prop，其次使用AuthContext，避免重复请求
	const currentUserId = propCurrentUserId || (authUser?.id ? String(authUser.id) : undefined);
	
	// 构建评论树的函数（提前定义，供初始化和加载时使用）
	const buildCommentTree = useCallback((flatComments: Comment[]): Comment[] => {
		const commentMap = new Map<string, Comment & { replies: Comment[]; parentAuthor?: { name: string | null; email: string } }>();
		const roots: Comment[] = [];
		const commentById = new Map<string, Comment>();

		// 创建映射和索引
		flatComments.forEach(comment => {
			commentMap.set(comment.id, { ...comment, replies: [] });
			commentById.set(comment.id, comment);
		});

		// 构建树，并添加父评论信息
		flatComments.forEach(comment => {
			const node = commentMap.get(comment.id)!;
			if (comment.parentId) {
				const parent = commentMap.get(comment.parentId);
				const parentComment = commentById.get(comment.parentId);
				if (parent) {
					// 添加父评论作者信息（用于显示"回复 @用户名"）
					if (parentComment) {
						node.parentAuthor = {
							name: parentComment.author.name,
							email: parentComment.author.email
						};
					}
					parent.replies.push(node);
				} else {
					// 父评论不存在，作为根评论
					roots.push(node);
				}
			} else {
				roots.push(node);
			}
		});

		return roots;
	}, []);

	// 初始化评论数据（如果有初始数据，构建树结构）
	useEffect(() => {
		if (initialComments && initialComments.length > 0 && comments.length === 0) {
			const commentTree = buildCommentTree(initialComments);
			setComments(commentTree);
		}
	}, [initialComments, buildCommentTree, comments.length]);

	// 不再需要单独获取用户ID，使用AuthContext即可

	// 加载评论
	const loadComments = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const res = await fetch(`/api/topics/${topicId}/comments?pageSize=1000`);
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error?.message || '加载评论失败');
			}

			if (data.success) {
				const flatComments = data.data.data || [];
				// 构建嵌套树结构（保持楼层号）
				const commentTree = buildCommentTree(flatComments);
				setComments(commentTree);
			} else {
				// 如果没有数据，使用初始数据（如果提供）
				if (initialComments && initialComments.length > 0) {
					setComments(buildCommentTree(initialComments));
				}
			}
		} catch (err: any) {
			setError(err.message || '加载评论失败');
		} finally {
			setLoading(false);
		}
	}, [topicId, buildCommentTree, initialComments]);

	useEffect(() => {
		// 如果没有初始数据，才加载
		if (!initialComments) {
			loadComments();
		}
	}, [loadComments, initialComments]);

	// buildCommentTree 已在上面使用 useCallback 定义

	// 提交评论（新评论）
	const handleSubmit = async () => {
		if (!currentUserId) {
			setError('请先登录');
			setTimeout(() => setError(null), 3000);
			return;
		}

		const content = (document.getElementById('new-comment-content') as HTMLTextAreaElement)?.value || '';
		
		if (!content.trim()) {
			setError('请输入评论内容');
			setTimeout(() => setError(null), 3000);
			return;
		}

		try {
			setSubmitting(true);
			setError(null);

			const res = await fetch(`/api/topics/${topicId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: content.trim()
				})
			});

			const data = await res.json();

			if (!res.ok) {
				// 处理频率限制错误
				if (res.status === 429) {
					throw new Error('评论过于频繁，请稍后再试');
				}
				throw new Error(data.error?.message || '发表评论失败');
			}

			// 重新加载评论
			await loadComments();
			
			// 清空输入
			const textarea = document.getElementById('new-comment-content') as HTMLTextAreaElement;
			if (textarea) textarea.value = '';
		} catch (err: any) {
			setError(err.message || '发表评论失败');
			setTimeout(() => setError(null), 5000);
		} finally {
			setSubmitting(false);
		}
	};

	// 提交回复
	const handleReply = async (parentId: string, content: string) => {
		if (!currentUserId) {
			setError('请先登录');
			setTimeout(() => setError(null), 3000);
			return;
		}

		if (!content.trim()) {
			setError('请输入回复内容');
			setTimeout(() => setError(null), 3000);
			return;
		}

		try {
			setError(null);

			const res = await fetch(`/api/topics/${topicId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: content.trim(),
					parentId
				})
			});

			const data = await res.json();

			if (!res.ok) {
				// 处理频率限制错误
				if (res.status === 429) {
					throw new Error('评论过于频繁，请稍后再试');
				}
				throw new Error(data.error?.message || '发表回复失败');
			}

			// 重新加载评论
			await loadComments();
		} catch (err: any) {
			setError(err.message || '发表回复失败');
			setTimeout(() => setError(null), 5000);
			throw err; // 重新抛出错误，让 CommentItem 知道提交失败
		}
	};

	// 编辑评论
	const handleEdit = async (commentId: string, content: string) => {
		try {
			setError(null);
			const res = await fetch(`/api/topics/${topicId}/comments/${commentId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error?.message || '编辑评论失败');
			}

			// 重新加载评论
			await loadComments();
		} catch (err: any) {
			setError(err.message || '编辑评论失败');
			setTimeout(() => setError(null), 5000);
		}
	};

	// 删除评论
	const handleDelete = async (commentId: string) => {
		if (!confirm('确定要删除这条评论吗？')) {
			return;
		}

		try {
			setError(null);
			const res = await fetch(`/api/topics/${topicId}/comments/${commentId}`, {
				method: 'DELETE'
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error?.message || '删除评论失败');
			}

			// 重新加载评论
			await loadComments();
		} catch (err: any) {
			setError(err.message || '删除评论失败');
			setTimeout(() => setError(null), 5000);
		}
	};

	if (loading) {
		return (
			<div className="card-academic" style={{ padding: 'var(--spacing-lg)' }}>
				<h3 style={{ marginTop: 0 }}>评论</h3>
				<p style={{ color: 'var(--color-text-secondary)' }}>加载中...</p>
			</div>
		);
	}

	return (
		<div className="card-academic" style={{ padding: 'var(--spacing-lg)' }}>
			<h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>评论</h3>

			{error && (
				<div style={{ 
					padding: 'var(--spacing-md)', 
					background: 'var(--color-error)', 
					color: 'white',
					borderRadius: 'var(--radius-sm)',
					marginBottom: 'var(--spacing-md)',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center'
				}}>
					<span>{error}</span>
					<button
						onClick={() => setError(null)}
						style={{
							background: 'transparent',
							border: 'none',
							color: 'white',
							cursor: 'pointer',
							padding: '4px 8px',
							fontSize: 'var(--font-size-lg)',
							lineHeight: 1,
							marginLeft: 'var(--spacing-sm)'
						}}
						aria-label="关闭错误提示"
					>
						×
					</button>
				</div>
			)}

			{/* 评论输入框 */}
			{currentUserId ? (
				<div style={{ marginBottom: 'var(--spacing-lg)' }}>
					<textarea
						id="new-comment-content"
						placeholder="发表评论...（支持 Markdown 格式）"
						maxLength={5000}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
								e.preventDefault();
								handleSubmit();
							}
						}}
						onChange={(e) => {
							const length = e.target.value.length;
							const counter = document.getElementById('comment-length-counter');
							if (counter) {
								counter.textContent = `${length}/5000`;
								counter.style.color = length > 4500 ? 'var(--color-error)' : 
									length > 4000 ? 'var(--color-warning)' : 'var(--color-text-secondary)';
							}
						}}
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
							id="comment-length-counter"
							style={{ 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--color-text-secondary)'
							}}
						>
							0/5000
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
							onClick={() => handleSubmit()}
							disabled={submitting}
							style={{
								padding: '8px 16px',
								background: 'var(--color-primary)',
								color: 'white',
								border: 'none',
								borderRadius: 'var(--radius-sm)',
								cursor: submitting ? 'not-allowed' : 'pointer',
								opacity: submitting ? 0.6 : 1,
								fontSize: 'var(--font-size-sm)',
								fontWeight: 500,
								transition: 'all var(--transition-fast)'
							}}
							onMouseEnter={(e) => {
								if (!submitting) {
									e.currentTarget.style.opacity = '0.9';
									e.currentTarget.style.transform = 'translateY(-1px)';
								}
							}}
							onMouseLeave={(e) => {
								if (!submitting) {
									e.currentTarget.style.opacity = '1';
									e.currentTarget.style.transform = 'translateY(0)';
								}
							}}
						>
							{submitting ? '提交中...' : '发表评论'}
						</button>
						<span style={{
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-tertiary)'
						}}>
							Ctrl+Enter 提交
						</span>
					</div>
				</div>
			) : (
				<div style={{ 
					padding: 'var(--spacing-md)', 
					background: 'var(--color-background-subtle)',
					borderRadius: 'var(--radius-sm)',
					marginBottom: 'var(--spacing-lg)',
					textAlign: 'center',
					color: 'var(--color-text-secondary)'
				}}>
					请先登录以发表评论
				</div>
			)}

			{/* 评论列表 */}
			{comments.length > 0 ? (
				<div>
					{comments.map(comment => (
						<CommentItem
							key={comment.id}
							comment={comment}
							currentUserId={currentUserId}
							onReply={handleReply}
							onEdit={handleEdit}
							onDelete={handleDelete}
						/>
					))}
				</div>
			) : (
				<div style={{ 
					padding: 'var(--spacing-xl)', 
					textAlign: 'center',
					color: 'var(--color-text-secondary)'
				}}>
					暂无评论
				</div>
			)}
		</div>
	);
}

