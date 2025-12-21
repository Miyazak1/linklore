'use client';

import GameCard, { GameConfig } from '@/components/games/GameCard';

/**
 * 游戏配置列表
 * 未来可以扩展更多游戏
 */
const GAMES: GameConfig[] = [
	{
		id: 'baike',
		name: '每日百科',
		description: '猜出隐藏的百科标题，挑战你的知识储备。每次只能输入一个字符，用最少的次数猜出答案！',
		icon: '📚',
		route: '/games/baike',
		status: 'active',
		featured: true
	},
	{
		id: 'daily-issue',
		name: '每日议题',
		description: '通过多轮选择完成一次完整的公共问题思考过程。不判对错，只呈现思考路径。',
		icon: '💭',
		route: '/games/daily-issue',
		status: 'active',
		featured: true
	}
];

/**
 * 游戏区组件
 * 在首页展示所有可用的小游戏
 */
export default function GameZone() {
	return (
		<div>
			<div style={{
				marginBottom: 'var(--spacing-lg)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between'
			}}>
				<h2 style={{
					fontSize: 'var(--font-size-2xl)',
					fontWeight: 600,
					color: 'var(--color-text-primary)',
					margin: 0
				}}>
					小游戏
				</h2>
			</div>

			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
				gap: 'var(--spacing-lg)'
			}}>
				{GAMES.map(game => (
					<GameCard key={game.id} game={game} />
				))}
			</div>
		</div>
	);
}

