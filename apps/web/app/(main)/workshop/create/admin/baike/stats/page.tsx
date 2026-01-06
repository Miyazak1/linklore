'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BookIcon, ChevronLeftIcon, ShieldIcon, LoadingSpinner, ChartIcon } from '@/components/ui/Icons';

interface BaikeStats {
	date: string;
	totalQuestions: number;
	totalPlays: number;
	totalCompleted: number;
	totalFailed: number;
	uniquePlayers: number;
	averageGuesses: number;
	questionTitle?: string | null;
	questionCategory?: string | null;
}

export default function BaikeStatsPage() {
	const router = useRouter();
	const { user, isAuthenticated } = useAuth();
	const [loading, setLoading] = useState(true);
	const [selectedDate, setSelectedDate] = useState<string>('');
	const [stats, setStats] = useState<BaikeStats | null>(null);
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

		loadTodayStats();
	}, [isAuthenticated, user, router]);

	// 获取今天的日期字符串 (YYYYMMDD)
	const getTodayDateString = () => {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		return `${year}${month}${day}`;
	};

	const loadTodayStats = async () => {
		const today = getTodayDateString();
		setSelectedDate(today);
		await loadStats(today);
	};

	const loadStats = async (date: string) => {
		try {
			setLoading(true);
			setError(null);

			// 调用统计API
			const res = await fetch(`/api/workshop/admin/baike/stats?date=${date}`);
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || '加载统计数据失败');
			}

			setStats(data.stats);
		} catch (err: any) {
			setError(err.message || '加载统计数据失败');
		} finally {
			setLoading(false);
		}
	};

	const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const dateStr = e.target.value.replace(/-/g, '');
		setSelectedDate(dateStr);
		await loadStats(dateStr);
	};

	if (loading && !stats) {
		return (
			<main style={{
				padding: 'var(--spacing-xl)',
				maxWidth: 1200,
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
			maxWidth: 1200,
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
						background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0
					}}>
						<ChartIcon size={24} color="white" />
					</div>
					<div>
						<h1 style={{
							margin: 0,
							fontSize: 'var(--font-size-2xl)',
							fontWeight: 700,
							color: 'var(--color-text-primary)'
						}}>每日百科统计</h1>
						<p style={{
							margin: 0,
							fontSize: 'var(--font-size-sm)',
							color: 'var(--color-text-secondary)'
						}}>查看游戏数据统计</p>
					</div>
				</div>
			</div>

			{/* 日期选择 */}
			<div style={{
				background: 'var(--color-background-paper)',
				borderRadius: 'var(--radius-lg)',
				padding: 'var(--spacing-xl)',
				border: '1px solid var(--color-border-light)',
				marginBottom: 'var(--spacing-xl)'
			}}>
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
					onChange={handleDateChange}
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

			{/* 错误提示 */}
			{error && (
				<div style={{
					padding: 'var(--spacing-md)',
					marginBottom: 'var(--spacing-xl)',
					background: 'var(--color-error-lighter)',
					color: 'var(--color-error)',
					borderRadius: 'var(--radius-md)',
					border: '1px solid var(--color-error)',
					fontSize: 'var(--font-size-sm)'
				}}>
					{error}
				</div>
			)}

			{/* 统计卡片区域 */}
			{stats && (
				<div>
					{/* 题目信息 */}
					{stats.questionTitle && (
						<div style={{
							background: 'var(--color-background-paper)',
							borderRadius: 'var(--radius-lg)',
							padding: 'var(--spacing-xl)',
							border: '1px solid var(--color-border-light)',
							marginBottom: 'var(--spacing-xl)'
						}}>
							<div style={{
								fontSize: 'var(--font-size-xs)',
								color: 'var(--color-text-tertiary)',
								marginBottom: 'var(--spacing-xs)'
							}}>
								当日题目
							</div>
							<div style={{
								fontSize: 'var(--font-size-lg)',
								fontWeight: 600,
								color: 'var(--color-text-primary)',
								marginBottom: 'var(--spacing-xs)'
							}}>
								{stats.questionTitle}
							</div>
							{stats.questionCategory && (
								<div style={{
									fontSize: 'var(--font-size-sm)',
									color: 'var(--color-text-secondary)'
								}}>
									{stats.questionCategory}
								</div>
							)}
						</div>
					)}

					{/* 统计卡片网格 */}
					<div style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
						gap: 'var(--spacing-lg)',
						marginBottom: 'var(--spacing-xl)'
					}}>
						{/* 题目数 */}
						<div style={{
							background: 'var(--color-background-paper)',
							borderRadius: 'var(--radius-lg)',
							padding: 'var(--spacing-xl)',
							border: '1px solid var(--color-border-light)'
						}}>
							<div style={{
								fontSize: 'var(--font-size-xs)',
								color: 'var(--color-text-tertiary)',
								marginBottom: 'var(--spacing-xs)'
							}}>
								题目数
							</div>
							<div style={{
								fontSize: 'var(--font-size-3xl)',
								fontWeight: 700,
								color: 'var(--color-primary)'
							}}>
								{stats.totalQuestions}
							</div>
						</div>

						{/* 游玩人数 */}
						<div style={{
							background: 'var(--color-background-paper)',
							borderRadius: 'var(--radius-lg)',
							padding: 'var(--spacing-xl)',
							border: '1px solid var(--color-border-light)'
						}}>
							<div style={{
								fontSize: 'var(--font-size-xs)',
								color: 'var(--color-text-tertiary)',
								marginBottom: 'var(--spacing-xs)'
							}}>
								游玩人数
							</div>
							<div style={{
								fontSize: 'var(--font-size-3xl)',
								fontWeight: 700,
								color: 'var(--color-primary)'
							}}>
								{stats.uniquePlayers}
							</div>
						</div>

						{/* 游玩次数 */}
						<div style={{
							background: 'var(--color-background-paper)',
							borderRadius: 'var(--radius-lg)',
							padding: 'var(--spacing-xl)',
							border: '1px solid var(--color-border-light)'
						}}>
							<div style={{
								fontSize: 'var(--font-size-xs)',
								color: 'var(--color-text-tertiary)',
								marginBottom: 'var(--spacing-xs)'
							}}>
								游玩次数
							</div>
							<div style={{
								fontSize: 'var(--font-size-3xl)',
								fontWeight: 700,
								color: 'var(--color-primary)'
							}}>
								{stats.totalPlays}
							</div>
						</div>

						{/* 成功次数 */}
						<div style={{
							background: 'var(--color-background-paper)',
							borderRadius: 'var(--radius-lg)',
							padding: 'var(--spacing-xl)',
							border: '1px solid var(--color-border-light)'
						}}>
							<div style={{
								fontSize: 'var(--font-size-xs)',
								color: 'var(--color-text-tertiary)',
								marginBottom: 'var(--spacing-xs)'
							}}>
								成功次数
							</div>
							<div style={{
								fontSize: 'var(--font-size-3xl)',
								fontWeight: 700,
								color: 'var(--color-success)'
							}}>
								{stats.totalCompleted}
							</div>
						</div>

						{/* 失败次数 */}
						<div style={{
							background: 'var(--color-background-paper)',
							borderRadius: 'var(--radius-lg)',
							padding: 'var(--spacing-xl)',
							border: '1px solid var(--color-border-light)'
						}}>
							<div style={{
								fontSize: 'var(--font-size-xs)',
								color: 'var(--color-text-tertiary)',
								marginBottom: 'var(--spacing-xs)'
							}}>
								失败次数
							</div>
							<div style={{
								fontSize: 'var(--font-size-3xl)',
								fontWeight: 700,
								color: 'var(--color-error)'
							}}>
								{stats.totalFailed}
							</div>
						</div>

						{/* 平均猜测次数 */}
						<div style={{
							background: 'var(--color-background-paper)',
							borderRadius: 'var(--radius-lg)',
							padding: 'var(--spacing-xl)',
							border: '1px solid var(--color-border-light)'
						}}>
							<div style={{
								fontSize: 'var(--font-size-xs)',
								color: 'var(--color-text-tertiary)',
								marginBottom: 'var(--spacing-xs)'
							}}>
								平均猜测次数
							</div>
							<div style={{
								fontSize: 'var(--font-size-3xl)',
								fontWeight: 700,
								color: 'var(--color-primary)'
							}}>
								{stats.averageGuesses.toFixed(1)}
							</div>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}

