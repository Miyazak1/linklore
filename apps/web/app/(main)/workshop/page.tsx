'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { GamepadIcon, PlusIcon } from '@/components/ui/Icons';
import { SearchInput, FilterButtons, GameCard } from '@/components/styles';

interface GameInstance {
	id: string;
	title: string;
	description?: string;
	coverUrl?: string;
	tags: string[];
	status: string;
	isPublic: boolean;
	difficulty?: number;
	isOfficial?: boolean; // 是否为官方游戏
	officialGameRoute?: string; // 官方游戏的跳转路径
	author: {
		email: string;
		name?: string;
		avatarUrl?: string;
	};
	createdAt: string;
	updatedAt: string;
	_count?: {
		plays: number;
	};
}

export default function WorkshopPage() {
	const { isAuthenticated } = useAuth();
	const [games, setGames] = useState<GameInstance[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');

	useEffect(() => {
		loadGames();
	}, [filterStatus]);

	const loadGames = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (filterStatus !== 'all') {
				params.append('status', filterStatus);
			}
			const res = await fetch(`/api/workshop/games?${params.toString()}`);
			
			if (!res.ok) {
				// 如果响应不成功，尝试读取错误信息
				let errorMessage = `HTTP ${res.status}`;
				try {
					const errorText = await res.text();
					if (errorText) {
						try {
							const errorJson = JSON.parse(errorText);
							errorMessage = errorJson.error || errorJson.message || errorText;
						} catch {
							errorMessage = errorText;
						}
					}
				} catch {
					// 如果读取响应失败，使用默认错误信息
				}
				console.error('加载游戏列表失败:', errorMessage);
				// 即使API失败，也设置空数组，避免页面显示错误
				setGames([]);
				return;
			}

			const data = await res.json();
			if (data.success && Array.isArray(data.games)) {
				setGames(data.games);
			} else {
				console.warn('API返回格式异常:', data);
				setGames([]);
			}
		} catch (err: any) {
			console.error('加载游戏列表失败:', err?.message || err);
			setGames([]);
		} finally {
			setLoading(false);
		}
	};

	const filteredGames = games.filter(game => {
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			return (
				game.title.toLowerCase().includes(query) ||
				game.description?.toLowerCase().includes(query) ||
				game.tags.some(tag => tag.toLowerCase().includes(query))
			);
		}
		return true;
	});

	return (
		<main className="page-container">
			{/* 页面标题 */}
			<div className="flex-row" style={{
				justifyContent: 'space-between',
				marginBottom: 'var(--spacing-xxl)',
				flexWrap: 'wrap',
				gap: 'var(--spacing-md)'
			}}>
				<div className="flex-row">
					<div className="icon-container">
						<GamepadIcon size={24} color="white" />
					</div>
					<div>
						<h1 className="page-title" style={{ margin: 0 }}>游戏工坊</h1>
						<p className="page-subtitle" style={{ margin: 0 }}>创建和分享你的互动游戏</p>
					</div>
				</div>
				{isAuthenticated && (
					<Link
						href="/workshop/create"
						className="btn-academic-primary"
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-xs)',
							textDecoration: 'none',
							padding: 'var(--spacing-sm) var(--spacing-lg)'
						}}
					>
						<PlusIcon size={20} color="currentColor" />
						<span>创建游戏</span>
					</Link>
				)}
			</div>

			{/* 搜索和筛选 */}
			<div className="flex-row" style={{
				gap: 'var(--spacing-md)',
				marginBottom: 'var(--spacing-xl)',
				flexWrap: 'wrap',
				alignItems: 'center'
			}}>
				<SearchInput
					value={searchQuery}
					onChange={setSearchQuery}
					placeholder="搜索游戏..."
				/>
				<FilterButtons
					options={[
						{ value: 'all', label: '全部' },
						{ value: 'published', label: '已发布' },
						{ value: 'draft', label: '草稿' }
					]}
					value={filterStatus}
					onChange={(value) => setFilterStatus(value as any)}
				/>
			</div>

			{/* 游戏列表 */}
			{loading ? (
				<div style={{
					textAlign: 'center',
					padding: 'var(--spacing-xxl)',
					color: 'var(--color-text-secondary)'
				}}>
					加载中...
				</div>
			) : filteredGames.length === 0 ? (
				<div className="card-academic" style={{
					textAlign: 'center',
					padding: 'var(--spacing-xxl)',
					background: 'var(--color-background-paper)',
					borderRadius: '4px'
				}}>
					<p style={{
						color: 'var(--color-text-secondary)',
						margin: 0
					}}>
						{searchQuery ? '没有找到匹配的游戏' : '还没有游戏，快来创建第一个吧！'}
					</p>
				</div>
			) : (
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
					gap: 'var(--spacing-md)'
				}}>
					{filteredGames.map((game) => (
						<GameCard
							key={game.id}
							id={game.id}
							title={game.title}
							description={game.description}
							coverUrl={game.coverUrl}
							tags={game.tags}
							status={game.status}
							isOfficial={game.isOfficial}
							officialGameRoute={game.officialGameRoute}
							author={game.author}
							playCount={game._count?.plays}
						/>
					))}
				</div>
			)}
		</main>
	);
}

