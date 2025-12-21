'use client';

import GameZone from '@/components/home/GameZone';
import ToolsZone from '@/components/home/ToolsZone';

interface NewHomePageProps {
	stats: {
		totalTopics: number;
		totalDocuments: number;
		totalUsers: number;
		totalBooks: number;
		totalTraces?: number;
		totalEntries?: number;
	};
}

/**
 * 新首页组件
 * 
 * 结构：
 * - 游戏区（展示各种小游戏）
 * - 工具区
 */
export default function NewHomePage({ stats }: NewHomePageProps) {
	return (
		<div style={{ 
			maxWidth: 1400, 
			margin: '0 auto',
			padding: 'clamp(var(--spacing-lg), 4vw, var(--spacing-xxl)) clamp(var(--spacing-md), 3vw, var(--spacing-xl))',
			position: 'relative'
		}}>
			{/* 游戏区 */}
			<GameZone />

			{/* 工具区 */}
			<ToolsZone />
		</div>
	);
}

