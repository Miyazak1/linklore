'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FirstTimeGuide from '@/components/games/daily-issue/FirstTimeGuide';
import DailyTopicBanner from '@/components/home/DailyTopicBanner';

/**
 * 每日议题游戏主页面
 * 显示今日议题和完整的游戏交互功能，首次体验引导，历史记录入口
 */
export default function DailyIssuePage() {
	const router = useRouter();
	const [showGuide, setShowGuide] = useState(false);

	useEffect(() => {
		// 检查是否首次访问（仅在客户端执行）
		if (typeof window !== 'undefined') {
			const hasVisited = localStorage.getItem('daily-issue-visited');
			if (!hasVisited) {
				setShowGuide(true);
			}
		}
	}, []);

	const handleViewHistory = () => {
		router.push('/games/daily-issue/history');
	};

	return (
		<div
			style={{
				maxWidth: '1200px',
				margin: '0 auto',
				padding: '24px'
			}}
		>
			{showGuide && (
				<FirstTimeGuide
					onClose={() => {
						setShowGuide(false);
						localStorage.setItem('daily-issue-visited', 'true');
					}}
				/>
			)}

			{/* 每日议题 Banner - 包含完整的游戏交互功能 */}
			<DailyTopicBanner />

			{/* 历史记录入口 */}
			<div style={{ marginTop: '24px', textAlign: 'center' }}>
				<button
					onClick={handleViewHistory}
					style={{
						padding: '12px 24px',
						background: 'var(--color-background-secondary)',
						border: '1px solid var(--color-border)',
						borderRadius: '6px',
						cursor: 'pointer',
						fontSize: '14px',
						color: 'var(--color-text)'
					}}
				>
					查看历史记录
				</button>
			</div>
		</div>
	);
}

