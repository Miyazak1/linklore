/**
 * GameCard - 游戏卡片组件
 * 用于显示游戏信息的卡片
 */

import React from 'react';
import Link from 'next/link';
import { GamepadIcon, BookIcon } from '@/components/ui/Icons';
import Avatar from '@/components/ui/Avatar';

export interface GameCardProps {
	/** 游戏 ID */
	id: string;
	/** 游戏标题 */
	title: string;
	/** 游戏描述 */
	description?: string;
	/** 封面图片 URL */
	coverUrl?: string;
	/** 标签列表 */
	tags: string[];
	/** 状态 */
	status: string;
	/** 是否官方游戏 */
	isOfficial?: boolean;
	/** 官方游戏路由 */
	officialGameRoute?: string;
	/** 作者信息 */
	author: {
		email: string;
		name?: string;
		avatarUrl?: string;
	};
	/** 游玩次数 */
	playCount?: number;
	/** 点击回调（可选，如果提供则使用回调而不是 Link） */
	onClick?: () => void;
}

/**
 * 游戏卡片组件
 * 
 * @example
 * <GameCard
 *   id={game.id}
 *   title={game.title}
 *   description={game.description}
 *   coverUrl={game.coverUrl}
 *   tags={game.tags}
 *   status={game.status}
 *   isOfficial={game.isOfficial}
 *   author={game.author}
 *   playCount={game._count?.plays}
 * />
 */
export function GameCard({
	id,
	title,
	description,
	coverUrl,
	tags,
	status,
	isOfficial = false,
	officialGameRoute,
	author,
	playCount,
	onClick
}: GameCardProps) {
	// 确定跳转链接
	const getGameLink = () => {
		if (isOfficial && officialGameRoute) {
			return officialGameRoute;
		}
		if (status === 'published') {
			return `/workshop/${id}/play`;
		}
		return `/workshop/${id}`;
	};

	const cardContent = (
		<div
			className="card-academic"
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				transition: 'border-color var(--transition-fast)',
				cursor: 'pointer'
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.borderColor = 'var(--color-border)';
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.borderColor = 'var(--color-border)';
			}}
		>
			{/* 封面 */}
			{coverUrl ? (
				<img
					src={coverUrl}
					alt={title}
					style={{
						width: '100%',
						height: '180px',
						objectFit: 'cover',
						borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
					}}
				/>
			) : (
				<div
					style={{
						width: '100%',
						height: '180px',
						background: isOfficial
							? 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)'
							: 'linear-gradient(135deg, var(--color-primary-lighter) 0%, var(--color-accent-cool-lighter) 100%)',
						borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center'
					}}
				>
					{isOfficial ? (
						<BookIcon size={48} color="var(--color-primary)" />
					) : (
						<GamepadIcon size={48} color="var(--color-primary)" />
					)}
				</div>
			)}

			{/* 内容 */}
			<div
				style={{
					padding: 'var(--spacing-md)',
					flex: 1,
					display: 'flex',
					flexDirection: 'column'
				}}
			>
				{/* 标题和状态 */}
				<div
					className="flex-row"
					style={{
						alignItems: 'start',
						justifyContent: 'space-between',
						marginBottom: 'var(--spacing-xs)',
						gap: 'var(--spacing-xs)'
					}}
				>
					<h3
						style={{
							margin: 0,
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							color: 'var(--color-text-primary)',
							flex: 1,
							lineHeight: 'var(--line-height-tight)',
							display: '-webkit-box',
							WebkitLineClamp: 2,
							WebkitBoxOrient: 'vertical',
							overflow: 'hidden'
						}}
					>
						{title}
					</h3>
					{isOfficial && (
						<span
							style={{
								fontSize: '10px',
								padding: '2px 6px',
								background: 'rgba(255, 152, 0, 0.15)',
								color: '#e65100',
								borderRadius: 'var(--radius-xs)',
								flexShrink: 0,
								fontWeight: 500,
								lineHeight: 1.2
							}}
						>
							官方
						</span>
					)}
					{!isOfficial && status === 'draft' && (
						<span
							style={{
								fontSize: '10px',
								padding: '2px 6px',
								background: 'var(--color-background-subtle)',
								color: 'var(--color-text-secondary)',
								borderRadius: 'var(--radius-xs)',
								flexShrink: 0,
								fontWeight: 500,
								lineHeight: 1.2
							}}
						>
							草稿
						</span>
					)}
				</div>

				{/* 描述 */}
				{description && (
					<p
						style={{
							margin: 'var(--spacing-xs) 0',
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-secondary)',
							lineHeight: 'var(--line-height-normal)',
							display: '-webkit-box',
							WebkitLineClamp: 2,
							WebkitBoxOrient: 'vertical',
							overflow: 'hidden'
						}}
					>
						{description}
					</p>
				)}

				{/* 标签 */}
				{tags.length > 0 && (
					<div
						style={{
							display: 'flex',
							flexWrap: 'wrap',
							gap: '4px',
							marginBottom: 'var(--spacing-xs)'
						}}
					>
						{tags.slice(0, 2).map((tag, idx) => (
							<span
								key={idx}
								style={{
									fontSize: '10px',
									padding: '2px 6px',
									background: 'var(--color-primary-lighter)',
									color: 'var(--color-primary-dark)',
									borderRadius: 'var(--radius-xs)',
									lineHeight: 1.2
								}}
							>
								{tag}
							</span>
						))}
					</div>
				)}

				{/* 底部信息 */}
				<div
					className="flex-row"
					style={{
						marginTop: 'auto',
						justifyContent: 'space-between',
						paddingTop: 'var(--spacing-xs)',
						borderTop: '1px solid var(--color-border-light)',
						fontSize: '11px',
						color: 'var(--color-text-tertiary)'
					}}
				>
					<div className="flex-row" style={{ gap: '4px' }}>
						<Avatar
							avatarUrl={author.avatarUrl}
							name={author.name || author.email.split('@')[0]}
							email={author.email}
							size={16}
						/>
						<span style={{ fontSize: '11px' }}>
							{author.name || author.email.split('@')[0]}
						</span>
					</div>
					{playCount !== undefined && playCount > 0 && (
						<span style={{ fontSize: '11px' }}>{playCount}</span>
					)}
				</div>
			</div>
		</div>
	);

	if (onClick) {
		return (
			<div onClick={onClick} style={{ textDecoration: 'none', color: 'inherit' }}>
				{cardContent}
			</div>
		);
	}

	return (
		<Link
			href={getGameLink()}
			style={{
				textDecoration: 'none',
				color: 'inherit'
			}}
		>
			{cardContent}
		</Link>
	);
}

