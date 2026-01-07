'use client';

import GameZone from '@/components/home/GameZone';
import ToolsZone from '@/components/home/ToolsZone';
import AlmanacWidget from '@/components/home/AlmanacWidget';

interface NewHomePageProps {
	stats: {
		totalTopics: number;
		totalDocuments: number;
		totalUsers: number;
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
			padding: '48px var(--spacing-xl)',
			position: 'relative'
		}}>
			{/* 黄历吉日 */}
			<AlmanacWidget />

			{/* 游戏区 */}
			<GameZone />

			{/* 工具区 */}
			<ToolsZone />
		</div>
	);
}

