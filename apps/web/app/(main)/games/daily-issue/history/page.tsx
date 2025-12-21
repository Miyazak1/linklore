'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createModuleLogger } from '@/lib/utils/logger';
import ChatPageLoader from '@/components/ui/ChatPageLoader';

const log = createModuleLogger('DailyIssueHistoryPage');

/**
 * 历史记录页面
 * 历史议题列表，我的思考路径回顾
 */
export default function DailyIssueHistoryPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [paths, setPaths] = useState<any[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadHistory();
	}, [page]);

	const loadHistory = async () => {
		try {
			setLoading(true);
			setError(null);

			const res = await fetch(
				`/api/games/daily-issue/history?page=${page}&limit=10`
			);
			if (!res.ok) {
				throw new Error('获取历史记录失败');
			}

			const data = await res.json();
			if (!data.success) {
				throw new Error(data.error || '获取历史记录失败');
			}

			setPaths(data.data.paths);
			setTotalPages(data.data.pagination.totalPages);
		} catch (error: any) {
			log.error('加载历史记录失败', error as Error);
			setError(error.message || '加载失败');
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateStr: string) => {
		if (dateStr.length !== 8) return dateStr;
		const year = dateStr.substring(0, 4);
		const month = dateStr.substring(4, 6);
		const day = dateStr.substring(6, 8);
		return `${year}-${month}-${day}`;
	};

	if (loading) {
		return (
			<ChatPageLoader
				message="加载中..."
				subMessage="正在获取历史记录"
			/>
		);
	}

	return (
		<div
			style={{
				maxWidth: '800px',
				margin: '0 auto',
				padding: '24px'
			}}
		>
			{/* 标题 */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: '24px'
				}}
			>
				<h1
					style={{
						fontSize: '24px',
						fontWeight: '600',
						color: 'var(--color-text)'
					}}
				>
					我的思考路径
				</h1>
				<button
					onClick={() => router.push('/games/daily-issue')}
					style={{
						padding: '8px 16px',
						background: 'var(--color-background-secondary)',
						border: '1px solid var(--color-border)',
						borderRadius: '6px',
						cursor: 'pointer',
						fontSize: '14px',
						color: 'var(--color-text)'
					}}
				>
					返回
				</button>
			</div>

			{/* 历史记录列表 */}
			{error ? (
				<div
					style={{
						padding: '24px',
						background: 'var(--color-background-secondary)',
						borderRadius: '8px',
						textAlign: 'center'
					}}
				>
					<p style={{ color: 'var(--color-text)', marginBottom: '16px' }}>
						{error}
					</p>
					<button
						onClick={loadHistory}
						style={{
							padding: '12px 24px',
							background: 'var(--color-primary)',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer',
							color: 'white',
							fontSize: '14px'
						}}
					>
						重试
					</button>
				</div>
			) : paths.length === 0 ? (
				<div
					style={{
						padding: '48px',
						background: 'var(--color-background-secondary)',
						borderRadius: '8px',
						textAlign: 'center'
					}}
				>
					<p style={{ color: 'var(--color-text-secondary)' }}>
						暂无历史记录
					</p>
					<button
						onClick={() => router.push('/games/daily-issue')}
						style={{
							marginTop: '16px',
							padding: '12px 24px',
							background: 'var(--color-primary)',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer',
							color: 'white',
							fontSize: '14px'
						}}
					>
						开始第一个思考
					</button>
				</div>
			) : (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '16px'
					}}
				>
					{paths.map((pathItem) => (
						<div
							key={pathItem.id}
							onClick={() =>
								router.push(`/games/daily-issue/${pathItem.date}`)
							}
							style={{
								padding: '20px',
								background: 'var(--color-background-secondary)',
								borderRadius: '8px',
								border: '1px solid var(--color-border)',
								cursor: 'pointer',
								transition: 'all 0.2s'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
							}}
						>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'start',
									marginBottom: '12px'
								}}
							>
								<div>
									<h3
										style={{
											fontSize: '16px',
											fontWeight: '600',
											color: 'var(--color-text)',
											marginBottom: '4px'
										}}
									>
										{pathItem.issue?.title || '未知议题'}
									</h3>
									<div
										style={{
											fontSize: '12px',
											color: 'var(--color-text-secondary)'
										}}
									>
										{formatDate(pathItem.date)}
									</div>
								</div>
								{pathItem.completed && (
									<div
										style={{
											padding: '4px 8px',
											background: 'var(--color-primary-light)',
											borderRadius: '4px',
											fontSize: '12px',
											color: 'var(--color-primary)'
										}}
									>
										已完成
									</div>
								)}
							</div>
							<div
								style={{
									fontSize: '14px',
									color: 'var(--color-text-secondary)'
								}}
							>
								路径长度: {Array.isArray(pathItem.path) ? pathItem.path.length : 0}{' '}
								步
							</div>
						</div>
					))}

					{/* 分页 */}
					{totalPages > 1 && (
						<div
							style={{
								display: 'flex',
								justifyContent: 'center',
								gap: '8px',
								marginTop: '24px'
							}}
						>
							<button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
								style={{
									padding: '8px 16px',
									background:
										page === 1
											? 'var(--color-background-secondary)'
											: 'var(--color-background)',
									border: '1px solid var(--color-border)',
									borderRadius: '6px',
									cursor: page === 1 ? 'not-allowed' : 'pointer',
									fontSize: '14px',
									color: 'var(--color-text)',
									opacity: page === 1 ? 0.5 : 1
								}}
							>
								上一页
							</button>
							<span
								style={{
									padding: '8px 16px',
									fontSize: '14px',
									color: 'var(--color-text-secondary)'
								}}
							>
								{page} / {totalPages}
							</span>
							<button
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page === totalPages}
								style={{
									padding: '8px 16px',
									background:
										page === totalPages
											? 'var(--color-background-secondary)'
											: 'var(--color-background)',
									border: '1px solid var(--color-border)',
									borderRadius: '6px',
									cursor: page === totalPages ? 'not-allowed' : 'pointer',
									fontSize: '14px',
									color: 'var(--color-text)',
									opacity: page === totalPages ? 0.5 : 1
								}}
							>
								下一页
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

