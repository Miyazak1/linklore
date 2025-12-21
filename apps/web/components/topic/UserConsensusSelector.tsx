'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UserList from './UserList';
import UserPairConsensus from './UserPairConsensus';

interface User {
	userId: string;
	email: string;
	name?: string;
	avatarUrl?: string | null;
	documentCount: number;
	discussionCount: number;
}

interface UserConsensusSelectorProps {
	topicId: string;
	currentUserId?: string;
	onUserSelect?: (userId: string | null) => void;
	initialUsers?: User[]; // 初始用户数据（服务端预加载）
}

/**
 * 用户共识选择器组件
 * 显示参与讨论的用户列表，点击用户后显示该用户对的分歧和共识分析
 */
export default function UserConsensusSelector({ 
	topicId, 
	currentUserId: propCurrentUserId,
	onUserSelect,
	initialUsers
}: UserConsensusSelectorProps) {
	const { user: authUser } = useAuth(); // 使用AuthContext获取用户信息
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	// 优先使用prop，其次使用AuthContext，避免重复请求
	const currentUserId = propCurrentUserId || (authUser?.id ? String(authUser.id) : undefined);

	// 当选中用户改变时，通知父组件
	useEffect(() => {
		onUserSelect?.(selectedUserId);
	}, [selectedUserId, onUserSelect]);

	return (
		<div className="card-academic" style={{ 
			marginBottom: 'var(--spacing-xl)',
			padding: 'var(--spacing-lg)',
			borderLeftColor: 'var(--color-error)'
		}}>
			<div style={{ marginBottom: 'var(--spacing-md)' }}>
				<h3 style={{ 
					margin: 0,
					marginBottom: 'var(--spacing-xs)',
					fontSize: 'var(--font-size-lg)',
					color: 'var(--color-text-primary)'
				}}>
					分歧和共识分析
				</h3>
				<p style={{ 
					margin: 0, 
					fontSize: 'var(--font-size-xs)', 
					color: 'var(--color-text-secondary)',
					lineHeight: 'var(--line-height-relaxed)'
				}}>
					选择直接相关的用户，查看您与该用户之间的分歧和共识分析
				</p>
			</div>
			
			{/* 用户列表 - 排除当前用户 */}
			<div style={{ marginBottom: selectedUserId && currentUserId ? 'var(--spacing-lg)' : 0 }}>
			<UserList
				topicId={topicId}
				currentUserId={currentUserId}
				excludeCurrentUser={true}
				selectedUserId={selectedUserId}
				initialUsers={initialUsers}
				onUserClick={(userId) => {
					console.log('[UserConsensusSelector] User clicked:', userId, 'currentUserId:', currentUserId);
					if (currentUserId && userId !== currentUserId) {
						setSelectedUserId(userId);
					} else {
						console.warn('[UserConsensusSelector] Cannot select user:', { userId, currentUserId });
					}
				}}
			/>
			</div>

			{/* 如果选中了用户，显示该用户对的分析 */}
			{selectedUserId && currentUserId ? (
				<div style={{
					marginTop: 'var(--spacing-lg)',
					paddingTop: 'var(--spacing-lg)',
					borderTop: '1px solid var(--color-border)'
				}}>
					<UserPairConsensus
						topicId={topicId}
						targetUserId={selectedUserId}
						currentUserId={currentUserId}
						onClose={() => {
							setSelectedUserId(null);
						}}
					/>
				</div>
			) : (
				selectedUserId && !currentUserId && (
					<div style={{
						marginTop: 'var(--spacing-lg)',
						padding: 'var(--spacing-md)',
						background: 'var(--color-bg-secondary)',
						borderRadius: 'var(--radius-md)',
						color: 'var(--color-text-secondary)',
						fontSize: 'var(--font-size-sm)',
						textAlign: 'center'
					}}>
						请先登录以查看分析结果
					</div>
				)
			)}
		</div>
	);
}

