'use client';

import GameCard, { GameConfig } from '@/components/games/GameCard';
import { BookIcon, TargetIcon } from '@/components/ui/Icons';

/**
 * 游戏配置列表
 * 未来可以扩展更多游戏
 */
const GAMES: GameConfig[] = [
	{
		id: 'baike',
		name: '每日百科',
		description: '猜出隐藏的百科标题，挑战你的知识储备。每次只能输入一个字符，用最少的次数猜出答案！',
		icon: BookIcon,
		route: '/games/baike',
		status: 'active',
		featured: true
	},
	{
		id: 'daily-issue',
		name: '每日议题',
		description: '通过多轮选择完成一次完整的公共问题思考过程。不判对错，只呈现思考路径。',
		icon: TargetIcon,
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
				marginBottom: '20px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between'
			}}>
				<h2 style={{
					fontSize: '18px',
					fontWeight: 600,
					color: '#2E3038',
					margin: 0
				}}>
					小游戏
				</h2>
			</div>

			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
				gap: '16px'
			}}>
				{GAMES.map(game => (
					<GameCard key={game.id} game={game} />
				))}
			</div>
		</div>
	);
}

