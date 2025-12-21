'use client';

import { useState, useEffect } from 'react';
import Avatar from '@/components/ui/Avatar';

interface User {
	userId: string;
	email: string;
	name?: string;
	avatarUrl?: string | null;
	documentCount: number;
	discussionCount: number;
}

interface User {
	userId: string;
	email: string;
	name?: string;
	avatarUrl?: string | null;
	documentCount: number;
	discussionCount: number;
}

interface UserListProps {
	topicId: string;
	currentUserId?: string;
	excludeCurrentUser?: boolean;
	selectedUserId?: string | null;
	onUserClick?: (userId: string) => void;
	initialUsers?: User[]; // 初始用户数据（服务端预加载）
}

export default function UserList({ 
	topicId, 
	currentUserId, 
	excludeCurrentUser = false,
	selectedUserId,
	onUserClick,
	initialUsers
}: UserListProps) {
	const [users, setUsers] = useState<User[]>(initialUsers || []);
	const [loading, setLoading] = useState(!initialUsers); // 如果有初始数据，不需要loading
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// 如果没有初始数据，才加载
		if (!initialUsers) {
			async function fetchUsers() {
				try {
					setLoading(true);
					// 如果提供了currentUserId，只获取与当前用户有直接讨论关系的用户
					const url = `/api/topics/${topicId}/consensus/users${currentUserId ? `?currentUserId=${currentUserId}` : ''}`;
					const response = await fetch(url);
					if (!response.ok) {
						throw new Error('获取用户列表失败');
					}
					const data = await response.json();
					let filteredUsers = data.users || [];
					
					// 如果设置了排除当前用户，过滤掉当前用户
					if (excludeCurrentUser && currentUserId) {
						filteredUsers = filteredUsers.filter((user: User) => user.userId !== currentUserId);
					}
					
					setUsers(filteredUsers);
				} catch (err: any) {
					setError(err.message || '加载失败');
				} finally {
					setLoading(false);
				}
			}

			fetchUsers();
		}
	}, [topicId, excludeCurrentUser, currentUserId, initialUsers]);

	if (loading) {
		return (
			<div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
				加载中...
			</div>
		);
	}

	if (error) {
		return (
			<div style={{ padding: 'var(--spacing-md)', color: 'var(--color-error)' }}>
				错误：{error}
			</div>
		);
	}

	if (users.length === 0) {
		return (
			<div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
				暂无参与讨论的用户
			</div>
		);
	}

	return (
		<div style={{ 
			display: 'flex', 
			flexDirection: 'column', 
			gap: 'var(--spacing-sm)' 
		}}>
			<div style={{
				padding: 'var(--spacing-sm) var(--spacing-md)',
				background: 'var(--color-bg-secondary)',
				borderRadius: 'var(--radius-md)',
				fontSize: 'var(--font-size-sm)',
				fontWeight: 600,
				color: 'var(--color-text-secondary)',
				display: 'grid',
				gridTemplateColumns: '2fr 1fr 1fr',
				gap: 'var(--spacing-md)'
			}}>
				<span>用户</span>
				<span>文档数</span>
				<span>讨论次数</span>
			</div>
			
			{users.map(user => {
				const isCurrentUser = currentUserId && user.userId === currentUserId;
				const isSelected = selectedUserId === user.userId;
				return (
					<div
						key={user.userId}
						onClick={() => onUserClick?.(user.userId)}
						style={{
							padding: 'var(--spacing-md)',
							background: isSelected ? 'var(--color-bg-highlight)' : isCurrentUser ? 'var(--color-bg-highlight)' : 'var(--color-bg)',
							border: `2px solid ${isSelected ? 'var(--color-primary)' : isCurrentUser ? 'var(--color-primary)' : 'var(--color-border)'}`,
							borderRadius: 'var(--radius-md)',
							cursor: onUserClick ? 'pointer' : 'default',
							transition: 'all 0.2s ease',
							display: 'grid',
							gridTemplateColumns: '2fr 1fr 1fr',
							gap: 'var(--spacing-md)',
							alignItems: 'center',
							boxShadow: isSelected ? '0 2px 8px rgba(33, 150, 243, 0.2)' : 'none'
						}}
						onMouseEnter={(e) => {
							if (onUserClick && !isSelected) {
								e.currentTarget.style.background = 'var(--color-bg-hover)';
								e.currentTarget.style.borderColor = 'var(--color-primary)';
							}
						}}
						onMouseLeave={(e) => {
							if (onUserClick) {
								e.currentTarget.style.background = isSelected ? 'var(--color-bg-highlight)' : isCurrentUser ? 'var(--color-bg-highlight)' : 'var(--color-bg)';
								e.currentTarget.style.borderColor = isSelected ? 'var(--color-primary)' : isCurrentUser ? 'var(--color-primary)' : 'var(--color-border)';
							}
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1 }}>
							<Avatar
								avatarUrl={user.avatarUrl}
								name={user.name}
								email={user.email}
								size={32}
							/>
							<div style={{ flex: 1, minWidth: 0 }}>
								<div style={{
									fontWeight: 600,
									color: isSelected ? 'var(--color-primary)' : isCurrentUser ? 'var(--color-primary)' : 'var(--color-text)',
									marginBottom: 'var(--spacing-xs)',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap'
								}}>
									{user.name || user.email}
									{isCurrentUser && (
										<span style={{
											marginLeft: 'var(--spacing-xs)',
											fontSize: 'var(--font-size-xs)',
											color: 'var(--color-primary)'
										}}>
											(我)
										</span>
									)}
								</div>
								{user.name && (
									<div style={{
										fontSize: 'var(--font-size-xs)',
										color: 'var(--color-text-secondary)',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap'
									}}>
										{user.email}
									</div>
								)}
							</div>
						</div>
						<div style={{
							textAlign: 'center',
							color: 'var(--color-text-secondary)',
							fontSize: 'var(--font-size-sm)'
						}}>
							{user.documentCount}
						</div>
						<div style={{
							textAlign: 'center',
							color: 'var(--color-text-secondary)',
							fontSize: 'var(--font-size-sm)'
						}}>
							{user.discussionCount}
						</div>
					</div>
				);
			})}
		</div>
	);
}



