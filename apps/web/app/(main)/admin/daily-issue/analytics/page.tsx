'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createModuleLogger } from '@/lib/utils/logger';
import ChatPageLoader from '@/components/ui/ChatPageLoader';

const log = createModuleLogger('DailyIssueAnalyticsPage');

// 禁用静态生成，强制动态渲染
export const dynamic = 'force-dynamic';

/**
 * 管理员分析后台
 * 路径分布可视化，完成率统计，反馈汇总，异常检测
 */
function DailyIssueAnalyticsPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false); // 初始不加载
	const [analytics, setAnalytics] = useState<any>(null);
	const [issueId, setIssueId] = useState<string>('');
	const [error, setError] = useState<string | null>(null);

	// 从 URL 参数中获取 issueId
	useEffect(() => {
		const urlIssueId = searchParams.get('issueId');
		if (urlIssueId) {
			setIssueId(urlIssueId);
			// 自动加载数据
			setTimeout(() => {
				loadAnalytics(urlIssueId);
			}, 100);
		}
	}, [searchParams]);

	const loadAnalytics = async (id?: string) => {
		const targetId = id || issueId;
		if (!targetId) {
			setError('请输入议题ID');
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const res = await fetch(
				`/api/games/daily-issue/analytics?issueId=${targetId}`
			);
			if (!res.ok) {
				if (res.status === 403) {
					throw new Error('需要管理员权限');
				}
				throw new Error('获取分析数据失败');
			}

			const data = await res.json();
			if (!data.success) {
				throw new Error(data.error || '获取分析数据失败');
			}

			setAnalytics(data.data);
		} catch (error: any) {
			log.error('加载分析数据失败', error as Error);
			setError(error.message || '加载失败');
		} finally {
			setLoading(false);
		}
	};

	if (loading && !analytics) {
		return (
			<ChatPageLoader
				message="加载中..."
				subMessage="正在获取分析数据"
			/>
		);
	}

	return (
		<div
			style={{
				maxWidth: '1200px',
				margin: '0 auto',
				padding: '24px'
			}}
		>
			{/* 标题 */}
			<h1
				style={{
					fontSize: '24px',
					fontWeight: '600',
					color: 'var(--color-text)',
					marginBottom: '24px'
				}}
			>
				议题分析后台
			</h1>

			{/* 查询表单 */}
			<div
				style={{
					padding: '20px',
					background: 'var(--color-background-secondary)',
					borderRadius: '8px',
					marginBottom: '24px'
				}}
			>
				<div
					style={{
						display: 'flex',
						gap: '12px',
						alignItems: 'center'
					}}
				>
					<input
						type="text"
						value={issueId}
						onChange={(e) => setIssueId(e.target.value)}
						placeholder="输入议题ID"
						style={{
							flex: 1,
							padding: '10px',
							border: '1px solid var(--color-border)',
							borderRadius: '6px',
							background: 'var(--color-background)',
							color: 'var(--color-text)',
							fontSize: '14px'
						}}
					/>
					<button
						onClick={() => loadAnalytics()}
						style={{
							padding: '10px 20px',
							background: 'var(--color-primary)',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer',
							fontSize: '14px',
							color: 'white',
							fontWeight: '500'
						}}
					>
						查询
					</button>
				</div>
			</div>

			{/* 错误提示 */}
			{error && (
				<div
					style={{
						padding: '16px',
						background: 'var(--color-background-secondary)',
						borderRadius: '8px',
						border: '1px solid var(--color-error)',
						marginBottom: '24px',
						color: 'var(--color-error)'
					}}
				>
					{error}
				</div>
			)}

			{/* 分析数据展示 */}
			{analytics && (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '24px'
					}}
				>
					{/* 基本信息 */}
					<div
						style={{
							padding: '20px',
							background: 'var(--color-background-secondary)',
							borderRadius: '8px'
						}}
					>
						<h2
							style={{
								fontSize: '18px',
								fontWeight: '600',
								color: 'var(--color-text)',
								marginBottom: '16px'
							}}
						>
							基本信息
						</h2>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
								gap: '16px'
							}}
						>
							<div>
								<div
									style={{
										fontSize: '12px',
										color: 'var(--color-text-secondary)',
										marginBottom: '4px'
									}}
								>
									总尝试次数
								</div>
								<div
									style={{
										fontSize: '20px',
										fontWeight: '600',
										color: 'var(--color-text)'
									}}
								>
									{analytics.analytics?.totalAttempts || 0}
								</div>
							</div>
							<div>
								<div
									style={{
										fontSize: '12px',
										color: 'var(--color-text-secondary)',
										marginBottom: '4px'
									}}
								>
									完成率
								</div>
								<div
									style={{
										fontSize: '20px',
										fontWeight: '600',
										color: 'var(--color-text)'
									}}
								>
									{analytics.analytics?.completionRate 
										? `${(analytics.analytics.completionRate * 100).toFixed(1)}%`
										: '0%'}
								</div>
							</div>
							<div>
								<div
									style={{
										fontSize: '12px',
										color: 'var(--color-text-secondary)',
										marginBottom: '4px'
									}}
								>
									平均完成时间
								</div>
								<div
									style={{
										fontSize: '20px',
										fontWeight: '600',
										color: 'var(--color-text)'
									}}
								>
									{analytics.analytics?.averageTime
										? `${Math.round(analytics.analytics.averageTime / 60)}分钟`
										: 'N/A'}
								</div>
							</div>
						</div>
					</div>

					{/* 路径分布 */}
					<div
						style={{
							padding: '20px',
							background: 'var(--color-background-secondary)',
							borderRadius: '8px'
						}}
					>
						<h2
							style={{
								fontSize: '18px',
								fontWeight: '600',
								color: 'var(--color-text)',
								marginBottom: '16px'
							}}
						>
							路径分布
						</h2>
						{analytics.analytics?.pathDistribution &&
						typeof analytics.analytics.pathDistribution === 'object' &&
						Object.keys(analytics.analytics.pathDistribution).length > 0 ? (
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: '12px'
								}}
							>
								{Object.entries(analytics.analytics?.pathDistribution || {})
									.sort(([, a], [, b]) => (b as number) - (a as number))
									.map(([pathKey, count]) => (
										<div
											key={pathKey}
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
												padding: '12px',
												background: 'var(--color-background)',
												borderRadius: '6px'
											}}
										>
											<div
												style={{
													fontSize: '14px',
													color: 'var(--color-text)',
													fontFamily: 'monospace'
												}}
											>
												{pathKey}
											</div>
											<div
												style={{
													fontSize: '14px',
													fontWeight: '600',
													color: 'var(--color-primary)'
												}}
											>
												{count as number} 次
											</div>
										</div>
									))}
							</div>
						) : (
							<p
								style={{
									color: 'var(--color-text-secondary)',
									fontSize: '14px'
								}}
							>
								暂无路径数据
							</p>
						)}
					</div>

					{/* 反馈统计 */}
					<div
						style={{
							padding: '20px',
							background: 'var(--color-background-secondary)',
							borderRadius: '8px'
						}}
					>
						<h2
							style={{
								fontSize: '18px',
								fontWeight: '600',
								color: 'var(--color-text)',
								marginBottom: '16px'
							}}
						>
							反馈统计
						</h2>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
								gap: '16px'
							}}
						>
							<div>
								<div
									style={{
										fontSize: '12px',
										color: 'var(--color-text-secondary)',
										marginBottom: '4px'
									}}
								>
									总反馈数
								</div>
								<div
									style={{
										fontSize: '18px',
										fontWeight: '600',
										color: 'var(--color-text)'
									}}
								>
									{analytics.feedback?.total || 0}
								</div>
							</div>
							<div>
								<div
									style={{
										fontSize: '12px',
										color: 'var(--color-text-secondary)',
										marginBottom: '4px'
									}}
								>
									有帮助
								</div>
								<div
									style={{
										fontSize: '18px',
										fontWeight: '600',
										color: 'var(--color-text)'
									}}
								>
									{analytics.feedback?.helpful || 0}
								</div>
							</div>
							<div>
								<div
									style={{
										fontSize: '12px',
										color: 'var(--color-text-secondary)',
										marginBottom: '4px'
									}}
								>
									中立
								</div>
								<div
									style={{
										fontSize: '18px',
										fontWeight: '600',
										color: 'var(--color-text)'
									}}
								>
									{analytics.feedback?.neutral || 0}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default function DailyIssueAnalyticsPage() {
	return (
		<Suspense fallback={<ChatPageLoader message="加载中..." subMessage="正在初始化页面" />}>
			<DailyIssueAnalyticsPageContent />
		</Suspense>
	);
}

