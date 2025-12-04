'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

interface User {
	id: string;
	email: string;
	name: string | null;
	role: 'member' | 'editor' | 'admin';
	createdAt: string;
	_count: {
		topics: number;
		documents: number;
	};
}

interface PaginatedUsers {
	data: User[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export default function AdminUsersPage() {
	const router = useRouter();
	const [users, setUsers] = useState<PaginatedUsers | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	const [roleFilter, setRoleFilter] = useState('');
	const [page, setPage] = useState(1);
	const [updating, setUpdating] = useState<Set<string>>(new Set());

	// 检查权限并加载用户列表
	useEffect(() => {
		loadUsers();
	}, [page, search, roleFilter]);

	const loadUsers = async () => {
		try {
			setLoading(true);
			setError(null);

			const params = new URLSearchParams({
				page: page.toString(),
				pageSize: '20'
			});
			if (search) params.append('search', search);
			if (roleFilter) params.append('role', roleFilter);

			const res = await fetch(`/api/admin/users?${params}`);
			const data = await res.json();

			if (!res.ok) {
				if (res.status === 403) {
					setError('需要管理员权限');
					return;
				}
				throw new Error(data.error?.message || '加载失败');
			}

			if (data.success) {
				setUsers(data.data);
			} else {
				throw new Error(data.error?.message || '加载失败');
			}
		} catch (err: any) {
			setError(err.message || '加载用户列表失败');
		} finally {
			setLoading(false);
		}
	};

	const handleRoleChange = async (userId: string, newRole: 'member' | 'editor' | 'admin') => {
		if (!confirm(`确定要将该用户的角色修改为"${newRole}"吗？`)) {
			return;
		}

		try {
			setUpdating((prev) => new Set(prev).add(userId));

			const res = await fetch(`/api/admin/users/${userId}/role`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: newRole })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error?.message || '更新失败');
			}

			// 重新加载用户列表
			await loadUsers();
		} catch (err: any) {
			alert(err.message || '更新角色失败');
		} finally {
			setUpdating((prev) => {
				const next = new Set(prev);
				next.delete(userId);
				return next;
			});
		}
	};

	const roleLabels: Record<string, string> = {
		member: '普通用户',
		editor: '编辑',
		admin: '管理员'
	};

	const roleColors: Record<string, string> = {
		member: 'var(--color-text-secondary)',
		editor: 'var(--color-primary)',
		admin: 'var(--color-error)'
	};

	if (loading && !users) {
		return (
			<div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
				<div>加载中...</div>
			</div>
		);
	}

	if (error && !users) {
		return (
			<div style={{ padding: 'var(--spacing-xl)' }}>
				<div className="card-academic" style={{ padding: 'var(--spacing-lg)' }}>
					<h2 style={{ marginBottom: 'var(--spacing-md)' }}>错误</h2>
					<p style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }}>
						{error}
					</p>
					<Button onClick={() => router.push('/')}>返回首页</Button>
				</div>
			</div>
		);
	}

	return (
		<div style={{ padding: 'var(--spacing-xl)', maxWidth: '1200px', margin: '0 auto' }}>
			<div className="card-academic" style={{ padding: 'var(--spacing-lg)' }}>
				<h1 style={{ marginBottom: 'var(--spacing-lg)' }}>用户管理</h1>

				{/* 搜索和筛选 */}
				<div
					style={{
						display: 'flex',
						gap: 'var(--spacing-md)',
						marginBottom: 'var(--spacing-lg)',
						flexWrap: 'wrap'
					}}
				>
					<input
						type="text"
						placeholder="搜索邮箱或姓名..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						style={{
							flex: 1,
							minWidth: '200px',
							padding: '8px 12px',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-md)',
							fontSize: 'var(--font-size-base)'
						}}
					/>
					<select
						value={roleFilter}
						onChange={(e) => {
							setRoleFilter(e.target.value);
							setPage(1);
						}}
						style={{
							padding: '8px 12px',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-md)',
							fontSize: 'var(--font-size-base)',
							background: 'var(--color-background-paper)'
						}}
					>
						<option value="">所有角色</option>
						<option value="member">普通用户</option>
						<option value="editor">编辑</option>
						<option value="admin">管理员</option>
					</select>
				</div>

				{/* 用户列表 */}
				{users && users.data.length > 0 ? (
					<>
						<div style={{ overflowX: 'auto' }}>
							<table
								style={{
									width: '100%',
									borderCollapse: 'collapse',
									fontSize: 'var(--font-size-base)'
								}}
							>
								<thead>
									<tr style={{ borderBottom: '2px solid var(--color-border)' }}>
										<th style={{ padding: 'var(--spacing-md)', textAlign: 'left' }}>邮箱</th>
										<th style={{ padding: 'var(--spacing-md)', textAlign: 'left' }}>姓名</th>
										<th style={{ padding: 'var(--spacing-md)', textAlign: 'left' }}>角色</th>
										<th style={{ padding: 'var(--spacing-md)', textAlign: 'left' }}>话题数</th>
										<th style={{ padding: 'var(--spacing-md)', textAlign: 'left' }}>文档数</th>
										<th style={{ padding: 'var(--spacing-md)', textAlign: 'left' }}>注册时间</th>
										<th style={{ padding: 'var(--spacing-md)', textAlign: 'left' }}>操作</th>
									</tr>
								</thead>
								<tbody>
									{users.data.map((user) => (
										<tr
											key={user.id}
											style={{
												borderBottom: '1px solid var(--color-border)'
											}}
										>
											<td style={{ padding: 'var(--spacing-md)' }}>{user.email}</td>
											<td style={{ padding: 'var(--spacing-md)' }}>
												{user.name || '-'}
											</td>
											<td style={{ padding: 'var(--spacing-md)' }}>
												<span
													style={{
														color: roleColors[user.role],
														fontWeight: 500
													}}
												>
													{roleLabels[user.role]}
												</span>
											</td>
											<td style={{ padding: 'var(--spacing-md)' }}>
												{user._count.topics}
											</td>
											<td style={{ padding: 'var(--spacing-md)' }}>
												{user._count.documents}
											</td>
											<td style={{ padding: 'var(--spacing-md)' }}>
												{new Date(user.createdAt).toLocaleDateString('zh-CN')}
											</td>
											<td style={{ padding: 'var(--spacing-md)' }}>
												<select
													value={user.role}
													onChange={(e) =>
														handleRoleChange(
															user.id,
															e.target.value as 'member' | 'editor' | 'admin'
														)
													}
													disabled={updating.has(user.id)}
													style={{
														padding: '4px 8px',
														border: '1px solid var(--color-border)',
														borderRadius: 'var(--radius-sm)',
														fontSize: 'var(--font-size-sm)',
														background: 'var(--color-background-paper)',
														cursor: updating.has(user.id) ? 'not-allowed' : 'pointer',
														opacity: updating.has(user.id) ? 0.6 : 1
													}}
												>
													<option value="member">普通用户</option>
													<option value="editor">编辑</option>
													<option value="admin">管理员</option>
												</select>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* 分页 */}
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginTop: 'var(--spacing-lg)',
								paddingTop: 'var(--spacing-md)',
								borderTop: '1px solid var(--color-border)'
							}}
						>
							<div style={{ color: 'var(--color-text-secondary)' }}>
								共 {users.total} 个用户，第 {users.page} / {users.totalPages} 页
							</div>
							<div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
								<Button
									variant="secondary"
									size="sm"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={!users.hasPrev}
								>
									上一页
								</Button>
								<Button
									variant="secondary"
									size="sm"
									onClick={() => setPage((p) => p + 1)}
									disabled={!users.hasNext}
								>
									下一页
								</Button>
							</div>
						</div>
					</>
				) : (
					<div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
						暂无用户
					</div>
				)}
			</div>
		</div>
	);
}

