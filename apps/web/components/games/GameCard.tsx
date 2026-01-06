'use client';

import Link from 'next/link';
import { IconProps } from '@/components/ui/Icons';

export interface GameConfig {
	id: string;
	name: string;
	description: string;
	icon: React.ComponentType<IconProps>;
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
					padding: '20px',
					background: '#FFFFFF',
					borderRadius: '8px',
					border: '1px solid rgba(0, 0, 0, 0.08)',
					cursor: isComingSoon ? 'not-allowed' : 'pointer',
					transition: 'transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast)',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					opacity: isComingSoon ? 0.6 : 1,
					position: 'relative'
				}}
				onMouseEnter={(e) => {
					if (!isComingSoon) {
						e.currentTarget.style.transform = 'translateY(-2px)';
						e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
						e.currentTarget.style.background = 'rgba(255, 107, 107, 0.04)';
					}
				}}
				onMouseLeave={(e) => {
					if (!isComingSoon) {
						e.currentTarget.style.transform = '';
						e.currentTarget.style.boxShadow = '';
						e.currentTarget.style.background = '#FFFFFF';
					}
				}}
			>
				{/* 游戏图标 */}
				<div 
					style={{ 
						marginBottom: '16px',
						lineHeight: 1,
						display: 'flex',
						alignItems: 'center'
					}}
				>
					{game.icon && <game.icon size={44} color="#2E3038" />}
				</div>

				{/* 游戏名称 */}
				<h3 style={{
					fontSize: '16px',
					fontWeight: 600,
					marginBottom: '10px',
					color: '#2E3038',
					lineHeight: 1.3
				}}>
					{game.name}
				</h3>

				{/* 游戏描述 */}
				<p style={{
					color: '#6B6B6B',
					fontSize: '13px',
					lineHeight: 1.6,
					marginBottom: 0,
					flex: 1
				}}>
					{game.description}
				</p>

				{/* 状态标签 */}
				{game.status === 'coming-soon' && (
					<div style={{
						display: 'inline-block',
						padding: '4px 8px',
						background: 'rgba(0, 0, 0, 0.04)',
						borderRadius: '4px',
						fontSize: '11px',
						color: '#6B6B6B',
						marginTop: 'auto'
					}}>
						即将推出
					</div>
				)}

				{/* 推荐标签 */}
				{game.featured && game.status === 'active' && (
					<div style={{
						position: 'absolute',
						top: '12px',
						right: '12px',
						padding: '3px 8px',
						background: '#FF6B6B',
						color: 'white',
						borderRadius: '4px',
						fontSize: '11px',
						fontWeight: 500,
						lineHeight: 1.4
					}}>
						推荐
					</div>
				)}
			</div>
		</Link>
	);
}











