'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BookIcon, ChevronLeftIcon, ShieldIcon, LoadingSpinner, PlusIcon, TrashIcon } from '@/components/ui/Icons';

export default function AdminBaikeEditPage() {
	const router = useRouter();
	const { user, isAuthenticated } = useAuth();
	const [loading, setLoading] = useState(true);
	const [todayQuestion, setTodayQuestion] = useState<any>(null);
	const [selectedDate, setSelectedDate] = useState<string>('');
	const [newTitle, setNewTitle] = useState('');
	const [newDescription, setNewDescription] = useState('');
	const [updating, setUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isAuthenticated) {
			router.push('/workshop/create');
			return;
		}

		if (user?.role !== 'admin') {
			router.push('/workshop/create');
			return;
		}

		loadTodayQuestion();
	}, [isAuthenticated, user, router]);

	// 获取今天的日期字符串 (YYYYMMDD)
	const getTodayDateString = () => {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		return `${year}${month}${day}`;
	};

	const loadTodayQuestion = async () => {
		try {
			setLoading(true);
			const today = getTodayDateString();
			setSelectedDate(today);

			const res = await fetch(`/api/games/baike/question?date=${today}`);
			const data = await res.json();

			if (res.ok && data.question) {
				setTodayQuestion(data.question);
				setNewTitle(data.question.title || '');
				setNewDescription(data.question.description || '');
			}
		} catch (err: any) {
			setError('加载题目失败');
		} finally {
			setLoading(false);
		}
	};

	const handleUpdate = async () => {
		if (!newTitle.trim()) {
			setError('请输入题目');
			return;
		}

		setUpdating(true);
		setError(null);

		try {
			// 触发更新接口
			const res = await fetch(`/api/games/baike/update?date=${selectedDate}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newTitle.trim(),
					description: newDescription.trim() || null
				})
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || '更新失败');
			}

			// 重新加载题目
			await loadTodayQuestion();
			setError(null);
		} catch (err: any) {
			setError(err.message || '更新失败');
		} finally {
			setUpdating(false);
		}
	};

	const handleDateChange = async (date: string) => {
		setSelectedDate(date);
		setLoading(true);
		setError(null);

		try {
			const res = await fetch(`/api/games/baike/question?date=${date}`);
			const data = await res.json();

			if (res.ok && data.question) {
				setTodayQuestion(data.question);
				setNewTitle(data.question.title || '');
				setNewDescription(data.question.description || '');
			} else {
				setNewTitle('');
				setNewDescription('');
				setTodayQuestion(null);
			}
		} catch (err: any) {
			setError('加载题目失败');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<main style={{
				padding: 'var(--spacing-xl)',
				maxWidth: 900,
				margin: '0 auto',
				textAlign: 'center'
			}}>
				<LoadingSpinner size="lg" color="var(--color-primary)" />
			</main>
		);
	}

	return (
		<main style={{
			padding: 'var(--spacing-xl)',
			maxWidth: 900,
			margin: '0 auto',
			background: 'var(--color-background)',
			minHeight: 'calc(100vh - 200px)'
		}}>
			{/* 页面标题 */}
			<div style={{
				marginBottom: 'var(--spacing-xxl)'
			}}>
				<button
					type="button"
					onClick={() => router.push('/workshop/create')}
					style={{
						marginBottom: 'var(--spacing-md)',
						padding: 'var(--spacing-sm)',
						border: '1px solid var(--color-border)',
						borderRadius: 'var(--radius-md)',
						background: 'var(--color-background-paper)',
						cursor: 'pointer',
						display: 'inline-flex',
						alignItems: 'center',
						gap: 'var(--spacing-xs)',
						fontSize: 'var(--font-size-sm)',
						color: 'var(--color-text-primary)'
					}}
				>
					<ChevronLeftIcon size={16} color="currentColor" />
					<span>返回</span>
				</button>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-md)'
				}}>
					<div style={{
						width: '48px',
						height: '48px',
						borderRadius: 'var(--radius-md)',
						background: 'linear-gradient(135deg, var(--color-warning) 0%, #d97706 100%)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0
					}}>
						<BookIcon size={24} color="white" />
					</div>
					<div>
						<h1 style={{
							margin: 0,
							fontSize: 'var(--font-size-2xl)',
							fontWeight: 700,
							color: 'var(--color-text-primary)'
						}}>编辑每日百科</h1>
						<p style={{
							margin: 0,
							fontSize: 'var(--font-size-sm)',
							color: 'var(--color-text-secondary)'
						}}>管理每日百科游戏题目</p>
					</div>
				</div>
			</div>

			{/* 编辑表单 */}
			<div style={{
				background: 'var(--color-background-paper)',
				borderRadius: 'var(--radius-lg)',
				padding: 'var(--spacing-xxl)',
				border: '1px solid var(--color-border-light)'
			}}>
				{/* 日期选择 */}
				<div style={{ marginBottom: 'var(--spacing-xl)' }}>
					<label style={{
						display: 'block',
						marginBottom: 'var(--spacing-xs)',
						fontSize: 'var(--font-size-sm)',
						fontWeight: 600,
						color: 'var(--color-text-primary)'
					}}>
						选择日期
					</label>
					<input
						type="date"
						value={selectedDate ? `${selectedDate.substring(0, 4)}-${selectedDate.substring(4, 6)}-${selectedDate.substring(6, 8)}` : ''}
						onChange={(e) => {
							const dateStr = e.target.value.replace(/-/g, '');
							handleDateChange(dateStr);
						}}
						style={{
							padding: 'var(--spacing-md)',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-md)',
							fontSize: 'var(--font-size-base)',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)'
						}}
					/>
				</div>

				{/* 当前题目信息 */}
				{todayQuestion && (
					<div style={{
						padding: 'var(--spacing-md)',
						background: 'var(--color-background-subtle)',
						borderRadius: 'var(--radius-md)',
						marginBottom: 'var(--spacing-xl)',
						border: '1px solid var(--color-border-light)'
					}}>
						<div style={{
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-tertiary)',
							marginBottom: 'var(--spacing-xs)'
						}}>
							当前题目
						</div>
						<div style={{
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							color: 'var(--color-text-primary)',
							marginBottom: 'var(--spacing-xs)'
						}}>
							{todayQuestion.title}
						</div>
						{todayQuestion.description && (
							<div style={{
								fontSize: 'var(--font-size-sm)',
								color: 'var(--color-text-secondary)'
							}}>
								{todayQuestion.description}
							</div>
						)}
					</div>
				)}

				{/* 编辑表单 */}
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 'var(--spacing-lg)'
				}}>
					<div>
						<label style={{
							display: 'block',
							marginBottom: 'var(--spacing-xs)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							题目 <span style={{ color: 'var(--color-error)' }}>*</span>
						</label>
						<input
							type="text"
							value={newTitle}
							onChange={(e) => setNewTitle(e.target.value)}
							placeholder="输入百科标题"
							required
							style={{
								width: '100%',
								padding: 'var(--spacing-md)',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)'
							}}
						/>
					</div>

					<div>
						<label style={{
							display: 'block',
							marginBottom: 'var(--spacing-xs)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							描述 (选填)
						</label>
						<textarea
							value={newDescription}
							onChange={(e) => setNewDescription(e.target.value)}
							placeholder="输入描述信息"
							rows={3}
							style={{
								width: '100%',
								padding: 'var(--spacing-md)',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
								fontFamily: 'inherit',
								resize: 'vertical'
							}}
						/>
					</div>
				</div>

				{/* 错误提示 */}
				{error && (
					<div style={{
						marginTop: 'var(--spacing-lg)',
						padding: 'var(--spacing-md)',
						background: 'var(--color-error-lighter)',
						color: 'var(--color-error)',
						borderRadius: 'var(--radius-md)',
						border: '1px solid var(--color-error)',
						fontSize: 'var(--font-size-sm)'
					}}>
						{error}
					</div>
				)}

				{/* 操作按钮 */}
				<div style={{
					display: 'flex',
					gap: 'var(--spacing-md)',
					marginTop: 'var(--spacing-xxl)',
					justifyContent: 'flex-end'
				}}>
					<button
						type="button"
						onClick={() => router.push('/workshop/create')}
						className="btn-academic"
						disabled={updating}
					>
						取消
					</button>
					<button
						type="button"
						onClick={handleUpdate}
						className="btn-academic-primary"
						disabled={updating || !newTitle.trim()}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-xs)'
						}}
					>
						{updating ? (
							<LoadingSpinner size="sm" color="currentColor" />
						) : (
							<ShieldIcon size={18} color="currentColor" />
						)}
						<span>{updating ? '更新中...' : '更新题目'}</span>
					</button>
				</div>
			</div>
		</main>
	);
}



