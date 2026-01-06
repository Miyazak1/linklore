'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { GamepadIcon, EditIcon, PlayIcon, TrashIcon } from '@/components/ui/Icons';
import Avatar from '@/components/ui/Avatar';
import type { GameInstance } from '@/types/workshop';

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const router = useRouter();
	const { user, isAuthenticated } = useAuth();
	const [game, setGame] = useState<GameInstance | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [id, setId] = useState<string | null>(null);

	useEffect(() => {
		params.then(({ id }) => {
			setId(id);
		});
	}, [params]);

	useEffect(() => {
		if (!id) return;
		loadGame();
	}, [id]);

	const loadGame = async () => {
		if (!id) return;
		try {
			setLoading(true);
			const res = await fetch(`/api/workshop/games/${id}`);
			const data = await res.json();
			
			if (!res.ok) {
				throw new Error(data.error || '加载失败');
			}
			
			setGame(data.game);
		} catch (err: any) {
			setError(err.message || '加载游戏失败');
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!game || !confirm('确定要删除这个游戏吗？')) return;
		
		try {
			const res = await fetch(`/api/workshop/games/${game.id}`, {
				method: 'DELETE'
			});
			
			if (res.ok) {
				router.push('/workshop');
			} else {
				const data = await res.json();
				alert(data.error || '删除失败');
			}
		} catch (err) {
			alert('删除失败');
		}
	};

	if (loading) {
		return (
			<main style={{
				padding: 'var(--spacing-xl)',
				maxWidth: 1200,
				margin: '0 auto',
				textAlign: 'center'
			}}>
				<p style={{ color: 'var(--color-text-secondary)' }}>加载中...</p>
			</main>
		);
	}

	if (error || !game) {
		return (
			<main style={{
				padding: 'var(--spacing-xl)',
				maxWidth: 1200,
				margin: '0 auto',
				textAlign: 'center'
			}}>
				<p style={{ color: 'var(--color-error)' }}>
					{error || '游戏不存在'}
				</p>
				<Link href="/workshop" style={{
					marginTop: 'var(--spacing-md)',
					display: 'inline-block',
					color: 'var(--color-primary)'
				}}>
					返回游戏工坊
				</Link>
			</main>
		);
	}

	const isAuthor = isAuthenticated && user?.id === game.authorId;

	return (
		<main style={{
			padding: 'var(--spacing-xl)',
			maxWidth: 1200,
			margin: '0 auto',
			background: 'var(--color-background)',
			minHeight: 'calc(100vh - 200px)'
		}}>
			{/* 游戏封面和标题 */}
			<div className="card-academic" style={{
				marginBottom: 'var(--spacing-xl)',
				padding: 0,
				overflow: 'hidden'
			}}>
				{game.coverUrl ? (
					<img
						src={game.coverUrl}
						alt={game.title}
						style={{
							width: '100%',
							height: '300px',
							objectFit: 'cover'
						}}
					/>
				) : (
					<div style={{
						width: '100%',
						height: '300px',
						background: 'linear-gradient(135deg, var(--color-primary-lighter) 0%, var(--color-accent-cool-lighter) 100%)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center'
					}}>
						<GamepadIcon size={64} color="var(--color-primary)" />
					</div>
				)}
				
				<div style={{
					padding: 'var(--spacing-xxl)'
				}}>
					<div style={{
						display: 'flex',
						alignItems: 'start',
						justifyContent: 'space-between',
						marginBottom: 'var(--spacing-md)',
						gap: 'var(--spacing-md)',
						flexWrap: 'wrap'
					}}>
						<div style={{ flex: 1, minWidth: 0 }}>
							<h1 style={{
								margin: 0,
								marginBottom: 'var(--spacing-sm)',
								fontSize: 'var(--font-size-2xl)',
								fontWeight: 700,
								color: 'var(--color-text-primary)'
							}}>
								{game.title}
							</h1>
							{game.description && (
								<p style={{
									margin: 0,
									fontSize: 'var(--font-size-base)',
									color: 'var(--color-text-secondary)',
									lineHeight: 'var(--line-height-relaxed)'
								}}>
									{game.description}
								</p>
							)}
						</div>
						
						{/* 操作按钮 */}
						<div style={{
							display: 'flex',
							gap: 'var(--spacing-sm)',
							flexWrap: 'wrap'
						}}>
							{game.status === 'published' && (
								<Link
									href={`/workshop/${game.id}/play`}
									className="btn-academic-primary"
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 'var(--spacing-xs)',
										textDecoration: 'none'
									}}
								>
									<PlayIcon size={18} color="currentColor" />
									<span>开始游戏</span>
								</Link>
							)}
							{isAuthor && (
								<>
									<Link
										href={`/workshop/${game.id}/edit`}
										className="btn-academic"
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 'var(--spacing-xs)',
											textDecoration: 'none'
										}}
									>
										<EditIcon size={18} color="currentColor" />
										<span>编辑</span>
									</Link>
									<button
										type="button"
										onClick={handleDelete}
										className="btn-academic"
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 'var(--spacing-xs)',
											color: 'var(--color-error)',
											borderColor: 'var(--color-error)'
										}}
									>
										<TrashIcon size={18} color="currentColor" />
										<span>删除</span>
									</button>
								</>
							)}
						</div>
					</div>

					{/* 标签和元信息 */}
					{game.tags.length > 0 && (
						<div style={{
							display: 'flex',
							flexWrap: 'wrap',
							gap: 'var(--spacing-xs)',
							marginBottom: 'var(--spacing-md)'
						}}>
							{game.tags.map((tag, idx) => (
								<span
									key={idx}
									style={{
										fontSize: 'var(--font-size-xs)',
										padding: 'var(--spacing-xxs) var(--spacing-sm)',
										background: 'var(--color-primary-lighter)',
										color: 'var(--color-primary-dark)',
										borderRadius: 'var(--radius-sm)'
									}}
								>
									{tag}
								</span>
							))}
						</div>
					)}

					<div style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: 'var(--spacing-md)',
						fontSize: 'var(--font-size-sm)',
						color: 'var(--color-text-secondary)',
						alignItems: 'center'
					}}>
						<div style={{
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-xs)'
						}}>
							<Avatar
								avatarUrl={game.author.avatarUrl}
								name={game.author.name || game.author.email.split('@')[0]}
								email={game.author.email}
								size={24}
							/>
							<span>{game.author.name || game.author.email.split('@')[0]}</span>
						</div>
						<span>创建于 {new Date(game.createdAt).toLocaleString('zh-CN')}</span>
						{game._count && game._count.plays > 0 && (
							<span>{game._count.plays} 次游玩</span>
						)}
						{game.status === 'draft' && (
							<span style={{
								padding: 'var(--spacing-xxs) var(--spacing-sm)',
								background: 'var(--color-background-subtle)',
								borderRadius: 'var(--radius-sm)'
							}}>
								草稿
							</span>
						)}
					</div>
				</div>
			</div>

			{/* 游戏信息 */}
			<div className="card-academic" style={{
				padding: 'var(--spacing-xxl)'
			}}>
				<h2 style={{
					marginTop: 0,
					marginBottom: 'var(--spacing-lg)',
					fontSize: 'var(--font-size-xl)',
					fontWeight: 600,
					color: 'var(--color-text-primary)'
				}}>游戏信息</h2>
				
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
					gap: 'var(--spacing-lg)'
				}}>
					<div>
						<div style={{
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-tertiary)',
							marginBottom: 'var(--spacing-xs)'
						}}>题目数量</div>
						<div style={{
							fontSize: 'var(--font-size-lg)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							{Array.isArray(game.questions) ? game.questions.length : 0}
						</div>
					</div>
					<div>
						<div style={{
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-tertiary)',
							marginBottom: 'var(--spacing-xs)'
						}}>展示模式</div>
						<div style={{
							fontSize: 'var(--font-size-lg)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							{game.modules?.displayMode === 'vertical' ? '垂直排列' :
							 game.modules?.displayMode === 'table' ? '表格' :
							 game.modules?.displayMode === 'slideshow' ? '幻灯片' :
							 game.modules?.displayMode === 'grid' ? '网格' : '默认'}
						</div>
					</div>
					{game.difficulty && (
						<div>
							<div style={{
								fontSize: 'var(--font-size-xs)',
								color: 'var(--color-text-tertiary)',
								marginBottom: 'var(--spacing-xs)'
							}}>难度</div>
							<div style={{
								fontSize: 'var(--font-size-lg)',
								fontWeight: 600,
								color: 'var(--color-text-primary)'
							}}>
								{'⭐'.repeat(game.difficulty)}
							</div>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}



