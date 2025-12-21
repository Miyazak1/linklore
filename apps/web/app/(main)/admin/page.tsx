'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { 
	UserIcon, 
	ShieldIcon,
	ChartIcon,
	SettingsIcon,
	PlusIcon
} from '@/components/ui/Icons';
import ChatPageLoader from '@/components/ui/ChatPageLoader';

interface AdminCard {
	id: string;
	title: string;
	description: string;
	icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
	href: string;
	color: string;
	category: 'content' | 'user' | 'system' | 'analytics';
}

const adminCards: AdminCard[] = [
	{
		id: 'users',
		title: '用户管理',
		description: '查看和管理所有用户，修改用户角色和权限',
		icon: UserIcon,
		href: '/admin/users',
		color: '#3b82f6',
		category: 'user'
	},
	{
		id: 'daily-issue-create',
		title: '创建每日议题',
		description: '使用AI辅助创建新的每日议题思考游戏',
		icon: PlusIcon,
		href: '/admin/daily-issue/create',
		color: '#10b981',
		category: 'content'
	},
	{
		id: 'daily-issue-analytics',
		title: '议题分析',
		description: '查看每日议题的数据分析和用户反馈',
		icon: ChartIcon,
		href: '/admin/daily-issue/analytics',
		color: '#8b5cf6',
		category: 'analytics'
	}
];

const categoryLabels: Record<string, string> = {
	content: '内容管理',
	user: '用户管理',
	system: '系统设置',
	analytics: '数据分析'
};

export default function AdminDashboardPage() {
	const router = useRouter();
	const { user, isAuthenticated, loading: authLoading } = useAuth();
	const [checking, setChecking] = useState(true);

	useEffect(() => {
		if (!authLoading) {
			if (!isAuthenticated || user?.role !== 'admin') {
				router.push('/');
			} else {
				setChecking(false);
			}
		}
	}, [isAuthenticated, user, authLoading, router]);

	if (authLoading || checking) {
		return <ChatPageLoader message="加载中..." />;
	}

	// 按分类分组
	const cardsByCategory = adminCards.reduce((acc, card) => {
		if (!acc[card.category]) {
			acc[card.category] = [];
		}
		acc[card.category].push(card);
		return acc;
	}, {} as Record<string, AdminCard[]>);

	return (
		<div
			style={{
				minHeight: '100vh',
				background: 'var(--color-background)',
				padding: 'var(--spacing-xl)'
			}}
		>
			<div
				style={{
					maxWidth: '1400px',
					margin: '0 auto'
				}}
			>
				{/* 页面标题 */}
				<div style={{ marginBottom: 'var(--spacing-xxl)' }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-md)',
							marginBottom: 'var(--spacing-sm)'
						}}
					>
						<ShieldIcon
							size={32}
							color="var(--color-primary)"
							style={{ flexShrink: 0 }}
						/>
						<h1
							style={{
								fontSize: 'var(--font-size-3xl)',
								fontWeight: '600',
								color: 'var(--color-text-primary)',
								margin: 0
							}}
						>
							管理面板
						</h1>
					</div>
					<p
						style={{
							fontSize: 'var(--font-size-base)',
							color: 'var(--color-text-secondary)',
							margin: 0,
							marginLeft: '40px'
						}}
					>
						管理和配置系统功能
					</p>
				</div>

				{/* 按分类展示卡片 */}
				{Object.entries(cardsByCategory).map(([category, cards]) => (
					<div key={category} style={{ marginBottom: 'var(--spacing-xxl)' }}>
						<h2
							style={{
								fontSize: 'var(--font-size-xl)',
								fontWeight: '600',
								color: 'var(--color-text-primary)',
								marginBottom: 'var(--spacing-lg)',
								paddingBottom: 'var(--spacing-sm)',
								borderBottom: '2px solid var(--color-border)'
							}}
						>
							{categoryLabels[category]}
						</h2>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
								gap: 'var(--spacing-lg)'
							}}
						>
							{cards.map((card) => {
								const IconComponent = card.icon;
								return (
									<div
										key={card.id}
										onClick={() => router.push(card.href)}
										style={{
											padding: 'var(--spacing-xl)',
											background: 'var(--color-background-paper)',
											borderRadius: 'var(--radius-lg)',
											border: '1px solid var(--color-border-light)',
											cursor: 'pointer',
											transition: 'all var(--transition-fast)',
											boxShadow: 'var(--shadow-subtle)',
											position: 'relative',
											overflow: 'hidden'
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.transform = 'translateY(-4px)';
											e.currentTarget.style.boxShadow = 'var(--shadow-md)';
											e.currentTarget.style.borderColor = card.color;
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.transform = '';
											e.currentTarget.style.boxShadow = 'var(--shadow-subtle)';
											e.currentTarget.style.borderColor = 'var(--color-border-light)';
										}}
									>
										{/* 装饰性颜色条 */}
										<div
											style={{
												position: 'absolute',
												top: 0,
												left: 0,
												right: 0,
												height: '4px',
												background: card.color
											}}
										/>
										
										{/* 图标 */}
										<div
											style={{
												width: '56px',
												height: '56px',
												borderRadius: 'var(--radius-md)',
												background: `${card.color}15`,
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												marginBottom: 'var(--spacing-md)'
											}}
										>
											<IconComponent
												size={28}
												color={card.color}
											/>
										</div>

										{/* 标题 */}
										<h3
											style={{
												fontSize: 'var(--font-size-lg)',
												fontWeight: '600',
												color: 'var(--color-text-primary)',
												marginBottom: 'var(--spacing-xs)',
												marginTop: 0
											}}
										>
											{card.title}
										</h3>

										{/* 描述 */}
										<p
											style={{
												fontSize: 'var(--font-size-sm)',
												color: 'var(--color-text-secondary)',
												lineHeight: 'var(--line-height-relaxed)',
												margin: 0
											}}
										>
											{card.description}
										</p>

										{/* 箭头指示 */}
										<div
											style={{
												marginTop: 'var(--spacing-md)',
												fontSize: 'var(--font-size-sm)',
												color: card.color,
												fontWeight: '500',
												display: 'flex',
												alignItems: 'center',
												gap: 'var(--spacing-xs)'
											}}
										>
											进入管理 →
										</div>
									</div>
								);
							})}
						</div>
					</div>
				))}

				{/* 快速统计（可选，未来可以添加） */}
				<div
					style={{
						marginTop: 'var(--spacing-xxl)',
						padding: 'var(--spacing-xl)',
						background: 'var(--color-background-secondary)',
						borderRadius: 'var(--radius-lg)',
						border: '1px solid var(--color-border-light)'
					}}
				>
					<h3
						style={{
							fontSize: 'var(--font-size-lg)',
							fontWeight: '600',
							color: 'var(--color-text-primary)',
							marginBottom: 'var(--spacing-md)',
							marginTop: 0
						}}
					>
						系统概览
					</h3>
					<p
						style={{
							fontSize: 'var(--font-size-sm)',
							color: 'var(--color-text-secondary)',
							margin: 0
						}}
					>
						更多统计功能正在开发中...
					</p>
				</div>
			</div>
		</div>
	);
}

