'use client';

import Link from 'next/link';

export interface GameConfig {
	id: string;
	name: string;
	description: string;
	icon: string;
	route: string;
	status: 'active' | 'coming-soon';
	featured?: boolean;
}

interface GameCardProps {
	game: GameConfig;
}

/**
 * 游戏卡片组件
 * 用于在首页游戏区展示各个小游戏
 */
export default function GameCard({ game }: GameCardProps) {
	const isComingSoon = game.status === 'coming-soon';

	return (
		<Link 
			href={isComingSoon ? '#' : game.route}
			style={{
				textDecoration: 'none',
				color: 'inherit',
				display: 'block'
			}}
			onClick={(e) => {
				if (isComingSoon) {
					e.preventDefault();
				}
			}}
		>
			<div
				style={{
					padding: 'var(--spacing-lg)',
					background: 'var(--color-background-paper)',
					borderRadius: 'var(--radius-md)',
					border: '1px solid var(--color-border-light)',
					cursor: isComingSoon ? 'not-allowed' : 'pointer',
					transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					opacity: isComingSoon ? 0.6 : 1,
					position: 'relative'
				}}
				onMouseEnter={(e) => {
					if (!isComingSoon) {
						e.currentTarget.style.transform = 'translateY(-4px)';
						e.currentTarget.style.boxShadow = 'var(--shadow-md)';
					}
				}}
				onMouseLeave={(e) => {
					if (!isComingSoon) {
						e.currentTarget.style.transform = '';
						e.currentTarget.style.boxShadow = '';
					}
				}}
			>
				{/* 游戏图标 */}
				<div 
					style={{ 
						fontSize: '48px', 
						marginBottom: 'var(--spacing-sm)',
						lineHeight: 1
					}}
				>
					{game.icon}
				</div>

				{/* 游戏名称 */}
				<h3 style={{
					fontSize: 'var(--font-size-lg)',
					fontWeight: 600,
					marginBottom: 'var(--spacing-xs)',
					color: 'var(--color-text-primary)'
				}}>
					{game.name}
				</h3>

				{/* 游戏描述 */}
				<p style={{
					color: 'var(--color-text-secondary)',
					fontSize: 'var(--font-size-sm)',
					lineHeight: 'var(--line-height-relaxed)',
					marginBottom: 'var(--spacing-sm)',
					flex: 1
				}}>
					{game.description}
				</p>

				{/* 状态标签 */}
				{game.status === 'coming-soon' && (
					<div style={{
						display: 'inline-block',
						padding: 'var(--spacing-xs) var(--spacing-sm)',
						background: 'var(--color-background-subtle)',
						borderRadius: 'var(--radius-sm)',
						fontSize: 'var(--font-size-xs)',
						color: 'var(--color-text-tertiary)',
						marginTop: 'auto'
					}}>
						即将推出
					</div>
				)}

				{/* 推荐标签 */}
				{game.featured && game.status === 'active' && (
					<div style={{
						position: 'absolute',
						top: 'var(--spacing-sm)',
						right: 'var(--spacing-sm)',
						padding: '2px 8px',
						background: 'var(--color-primary)',
						color: 'white',
						borderRadius: 'var(--radius-sm)',
						fontSize: 'var(--font-size-xs)',
						fontWeight: 500
					}}>
						推荐
					</div>
				)}
			</div>
		</Link>
	);
}

