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
	parentAuthor?: { name: string | null; email: string }; // 父评论作者（用于显示"回复 @用户名"）
}

interface TopicCommentsProps {
	topicId: string;
	currentUserId?: string;
	initialComments?: Comment[];
}

/**
 * 话题评论组件
 * 包含评论列表和评论输入
 */
export default function TopicComments({ topicId, currentUserId: propCurrentUserId, initialComments }: TopicCommentsProps) {
	const { user: authUser } = useAuth(); // 使用AuthContext获取用户信息
	const [allComments, setAllComments] = useState<Comment[]>([]); // 所有评论（根评论+回复）扁平数组
	const [loading, setLoading] = useState(!initialComments); // 如果有初始数据，不需要loading
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	// 每个根评论是否已展开（rootCommentId -> 是否展开）
	const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
	// 每个根评论的回复页码（rootCommentId -> 当前页码，从1开始）
	const [repliesPage, setRepliesPage] = useState<Record<string, number>>({});
	// 优先使用prop，其次使用AuthContext，避免重复请求
	const currentUserId = propCurrentUserId || (authUser?.id ? String(authUser.id) : undefined);
	
	// 扁平化评论结构：将所有评论（根评论+回复）展平到一个数组
	const buildFlatCommentList = useCallback((flatComments: Comment[]): Comment[] => {
		const commentById = new Map<string, Comment>();
		const result: Comment[] = [];

		// 创建映射
		flatComments.forEach(comment => {
			commentById.set(comment.id, { ...comment });
		});

		// 为每个回复添加父评论作者信息
		flatComments.forEach(comment => {
			if (comment.parentId) {
				const parentComment = commentById.get(comment.parentId);
				if (parentComment) {
					comment.parentAuthor = {
						name: parentComment.author.name,
						email: parentComment.author.email
					};
				}
			}
			result.push(comment);
		});

		// 按时间排序（从旧到新）
		result.sort((a, b) => 
			new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
		);

		return result;
	}, []);

	// 初始化评论数据（如果有初始数据，构建扁平数组）
	useEffect(() => {
		if (initialComments && initialComments.length > 0 && allComments.length === 0) {
			const flatList = buildFlatCommentList(initialComments);
			setAllComments(flatList);
		}
	}, [initialComments, buildFlatCommentList, allComments.length]);

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
				// 构建扁平数组
				const flatList = buildFlatCommentList(flatComments);
				setAllComments(flatList);
			} else {
				// 如果没有数据，使用初始数据（如果提供）
				if (initialComments && initialComments.length > 0) {
					setAllComments(buildFlatCommentList(initialComments));
				}
			}
		} catch (err: any) {
			setError(err.message || '加载评论失败');
		} finally {
			setLoading(false);
		}
	}, [topicId, buildFlatCommentList, initialComments]);

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

			// 找到父评论
			const parentComment = allComments.find(c => c.id === parentId);
			
			// 乐观更新：先立即显示新回复
			// 限制深度：只允许根评论（depth=0）和2级评论（depth=1）
			// 如果回复2级评论，仍然创建2级评论（depth=1），扁平显示
			const optimisticComment: Comment = {
				id: `temp-${Date.now()}`,
				parentId,
				authorId: currentUserId,
				author: {
					id: currentUserId,
					email: authUser?.email || '',
					name: authUser?.name || null,
					avatarUrl: authUser?.avatarUrl || null
				},
				content: content.trim(),
				depth: 1, // 所有回复都是2级评论（depth=1）
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				parentAuthor: parentComment ? {
					name: parentComment.author.name,
					email: parentComment.author.email
				} : undefined
			};

			// 立即更新UI：将新回复插入到父评论后面（用户视角）
			// 回复根评论：直接出现在根评论下方，成为排最前面的2级评论
			// 回复2级评论：直接显示在该2级评论的下方，原本位于其下方的2级评论自动下移
			setAllComments(prevComments => {
				const newComments = [...prevComments];
				const parentIndex = newComments.findIndex(c => c.id === parentId);
				if (parentIndex >= 0) {
					const parentComment = newComments[parentIndex];
					
					// 如果回复的是根评论（parentId === null），插入到根评论后面第一个位置
					if (parentComment.parentId === null) {
						// 找到根评论后面第一个不是该根评论直接回复的位置
						let insertIndex = parentIndex + 1;
						for (let i = parentIndex + 1; i < newComments.length; i++) {
							if (newComments[i].parentId === parentId) {
								// 这是该根评论的直接回复，继续查找
								insertIndex = i + 1;
							} else if (newComments[i].parentId === null) {
								// 遇到下一个根评论，停止查找，插入到当前位置
								break;
							} else {
								// 遇到其他2级评论（不是该根评论的回复），停止查找，插入到当前位置
								break;
							}
						}
						// 插入到第一个位置（直接显示在根评论下方）
						newComments.splice(parentIndex + 1, 0, optimisticComment);
					} else {
						// 如果回复的是2级评论，直接插入到该2级评论后面第一个位置
						// 不需要查找，直接插入到 parentIndex + 1
						newComments.splice(parentIndex + 1, 0, optimisticComment);
					}
				} else {
					// 如果找不到父评论，添加到末尾
					newComments.push(optimisticComment);
				}
				return newComments;
			});

			// 发送请求
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
				// 如果失败，回滚乐观更新
				await loadComments();
				// 处理频率限制错误
				if (res.status === 429) {
					throw new Error('评论过于频繁，请稍后再试');
				}
				throw new Error(data.error?.message || '发表回复失败');
			}

			// 成功后重新加载评论（按时间排序）
			await loadComments();
		} catch (err: any) {
			setError(err.message || '发表回复失败');
			setTimeout(() => setError(null), 5000);
			// 如果失败，重新加载以恢复正确状态
			await loadComments();
			throw err; // 重新抛出错误，让 CommentItem 知道提交失败
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
	
	// 计算评论总数
	const totalComments = allComments.length;

	return (
		<div className="card-academic" style={{ padding: 'var(--spacing-lg)' }}>
			<h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>
				评论
				<span style={{ 
					marginLeft: '8px', 
					fontSize: '16px', 
					fontWeight: 400, 
					color: 'var(--color-text-secondary)' 
				}}>
					({totalComments})
				</span>
			</h3>

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

			{/* 评论列表 - 扁平显示：所有评论都在同一层级渲染 */}
			{allComments.length > 0 ? (
				<div>
					{(() => {
						// 检查是否有乐观更新的临时评论（以temp-开头的ID）
						const hasOptimisticUpdate = allComments.some(c => c.id.startsWith('temp-'));
						
						// 先添加所有根评论（按时间排序）
						const rootComments = allComments
							.filter(c => c.parentId === null)
							.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
						
						const result: JSX.Element[] = [];
						
						rootComments.forEach(root => {
							// 渲染根评论
							result.push(
								<CommentItem
									key={root.id}
									comment={root}
									currentUserId={currentUserId}
									onReply={handleReply}
									onDelete={handleDelete}
									allComments={allComments}
								/>
							);
							
							// 获取该根评论的所有回复（递归收集）
							const getReplies = (parentId: string): Comment[] => {
								const directReplies = allComments
									.filter(c => c.parentId === parentId)
									.sort((a, b) => {
										if (hasOptimisticUpdate) {
											if (a.id.startsWith('temp-') && !b.id.startsWith('temp-')) return -1;
											if (!a.id.startsWith('temp-') && b.id.startsWith('temp-')) return 1;
										}
										return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
									});
								
								let allReplies: Comment[] = [];
								directReplies.forEach(reply => {
									allReplies.push(reply);
									allReplies = allReplies.concat(getReplies(reply.id));
								});
								return allReplies;
							};
							
							const replies = getReplies(root.id);
							const totalReplies = replies.length;
							
							if (totalReplies > 0) {
								const isExpanded = expandedReplies[root.id] || false;
								const pageSize = 5; // 每页5条
								
								let visibleReplies: Comment[];
								let shouldShowExpand = false;
								let shouldShowPagination = false;
								let currentPage = 1;
								let totalPages = 1;
								
								if (totalReplies <= 3) {
									// ≤3条：全部显示
									visibleReplies = replies;
								} else {
									// >3条
									if (!isExpanded) {
										// 未展开：只显示前3条
										visibleReplies = replies.slice(0, 3);
										shouldShowExpand = true;
									} else {
										// 已展开
										if (totalReplies <= 5) {
											// ≤5条：全部显示，不分页
											visibleReplies = replies;
										} else {
											// >5条：分页显示
											currentPage = repliesPage[root.id] || 1;
											totalPages = Math.ceil(totalReplies / pageSize);
											const startIndex = (currentPage - 1) * pageSize;
											visibleReplies = replies.slice(startIndex, startIndex + pageSize);
											shouldShowPagination = true;
										}
									}
								}
								
								// 渲染可见的回复
								visibleReplies.forEach(reply => {
									result.push(
										<CommentItem
											key={reply.id}
											comment={reply}
											currentUserId={currentUserId}
											onReply={handleReply}
											onDelete={handleDelete}
											allComments={allComments}
										/>
									);
								});
								
								// 显示"展开"按钮
								if (shouldShowExpand) {
									result.push(
										<div
											key={`expand-btn-${root.id}`}
											style={{
												marginLeft: '24px',
												marginBottom: 'var(--spacing-md)',
												display: 'inline-flex',
												alignItems: 'center',
												gap: '4px',
												padding: '6px 12px',
												cursor: 'pointer',
												color: 'var(--color-primary)',
												fontSize: '13px',
												fontWeight: 500,
												transition: 'all var(--transition-fast)',
												borderRadius: '4px'
											}}
											onClick={() => {
												setExpandedReplies(prev => ({
													...prev,
													[root.id]: true
												}));
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = 'rgba(25, 118, 210, 0.08)';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = 'transparent';
											}}
										>
											<span>展开{totalReplies - 3}条回复</span>
											<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
												<path d="M6 8L2 4h8z" />
											</svg>
										</div>
									);
								}
								
								// 如果需要分页，显示分页组件
								if (shouldShowPagination) {
									result.push(
										<div
											key={`pagination-${root.id}`}
											style={{
												marginLeft: '24px',
												marginBottom: 'var(--spacing-md)',
												display: 'flex',
												alignItems: 'center',
												gap: '8px',
												fontSize: '13px',
												color: 'var(--color-text-secondary)'
											}}
										>
											<span>共{totalPages}页</span>
											
											{/* 页码按钮 */}
											{(() => {
												const pageButtons: JSX.Element[] = [];
												const maxVisiblePages = 5; // 最多显示5个页码
												
												let startPage = Math.max(1, currentPage - 2);
												let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
												
												// 调整startPage，确保总是显示maxVisiblePages个页码（如果总页数足够）
												if (endPage - startPage < maxVisiblePages - 1) {
													startPage = Math.max(1, endPage - maxVisiblePages + 1);
												}
												
												for (let page = startPage; page <= endPage; page++) {
													pageButtons.push(
														<button
															key={page}
															onClick={() => {
																setRepliesPage(prev => ({
																	...prev,
																	[root.id]: page
																}));
															}}
															style={{
																padding: '4px 8px',
																border: page === currentPage ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
																borderRadius: '4px',
																background: page === currentPage ? 'var(--color-primary)' : 'transparent',
																color: page === currentPage ? 'white' : 'var(--color-text-primary)',
																cursor: 'pointer',
																fontSize: '13px',
																fontWeight: page === currentPage ? 500 : 400,
																transition: 'all var(--transition-fast)'
															}}
															onMouseEnter={(e) => {
																if (page !== currentPage) {
																	e.currentTarget.style.borderColor = 'var(--color-primary)';
																	e.currentTarget.style.color = 'var(--color-primary)';
																}
															}}
															onMouseLeave={(e) => {
																if (page !== currentPage) {
																	e.currentTarget.style.borderColor = 'var(--color-border)';
																	e.currentTarget.style.color = 'var(--color-text-primary)';
																}
															}}
														>
															{page}
														</button>
													);
												}
												
												// 如果总页数大于显示的页码数，显示省略号
												if (endPage < totalPages) {
													pageButtons.push(<span key="ellipsis">...</span>);
													pageButtons.push(<span key="total">{totalPages}</span>);
												}
												
												return pageButtons;
											})()}
											
											{/* 下一页按钮 */}
											{currentPage < totalPages && (
												<button
													onClick={() => {
														setRepliesPage(prev => ({
															...prev,
															[root.id]: currentPage + 1
														}));
													}}
													style={{
														padding: '4px 12px',
														border: '1px solid var(--color-border)',
														borderRadius: '4px',
														background: 'transparent',
														color: 'var(--color-text-primary)',
														cursor: 'pointer',
														fontSize: '13px',
														transition: 'all var(--transition-fast)'
													}}
													onMouseEnter={(e) => {
														e.currentTarget.style.borderColor = 'var(--color-primary)';
														e.currentTarget.style.color = 'var(--color-primary)';
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.borderColor = 'var(--color-border)';
														e.currentTarget.style.color = 'var(--color-text-primary)';
													}}
												>
													下一页
												</button>
											)}
										</div>
									);
								}
							}
						});
						
						return result;
					})()}
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

