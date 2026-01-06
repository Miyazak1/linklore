'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
	GamepadIcon, 
	FileIcon, 
	ImageIconComponent, 
	MousePointerClickIcon, 
	TargetIcon, 
	ListIcon, 
	QuestionIcon, 
	FolderTreeIcon, 
	PenToolIcon, 
	SortAscIcon, 
	SquareIcon, 
	CompareIcon,
	GridIcon,
	BookIcon,
	ShieldIcon
} from '@/components/ui/Icons';
import type { QuestionType } from '@/types/workshop';

interface GameType {
	id: QuestionType | 'select' | 'hint' | 'challenge' | 'minesweeper';
	name: string;
	description: string;
	icon: React.ComponentType<any>;
	color: string;
}

const gameTypes: GameType[] = [
	{
		id: 'text',
		name: '文本',
		description: '纯文本问答题目',
		icon: FileIcon,
		color: 'var(--color-primary)'
	},
	{
		id: 'image',
		name: '图片',
		description: '图片问答题目',
		icon: ImageIconComponent,
		color: 'var(--color-accent-warm)'
	},
	{
		id: 'click',
		name: '点选',
		description: '点击选择答案',
		icon: MousePointerClickIcon,
		color: 'var(--color-accent-cool)'
	},
	{
		id: 'fill-blank',
		name: '填空',
		description: '填空题',
		icon: SquareIcon,
		color: 'var(--color-accent-cool)'
	},
	{
		id: 'sort',
		name: '排序',
		description: '排序题目',
		icon: SortAscIcon,
		color: 'var(--color-primary)'
	},
	{
		id: 'categorize',
		name: '分类',
		description: '分类归类题目',
		icon: FolderTreeIcon,
		color: 'var(--color-accent-cool)'
	},
	{
		id: 'compare',
		name: '比较',
		description: '比较选择题目',
		icon: CompareIcon,
		color: 'var(--color-accent-warm)'
	},
	{
		id: 'svg-input',
		name: 'SVG 输入',
		description: '自定义图形输入',
		icon: PenToolIcon,
		color: 'var(--color-accent-warm)'
	},
	{
		id: 'minesweeper',
		name: '扫雷',
		description: '扫雷游戏模式',
		icon: GridIcon,
		color: 'var(--color-error)'
	},
	{
		id: 'select',
		name: '选择',
		description: '多项选择题',
		icon: ListIcon,
		color: 'var(--color-primary)'
	},
	{
		id: 'hint',
		name: '提示',
		description: '带提示的题目',
		icon: QuestionIcon,
		color: 'var(--color-warning)'
	},
	{
		id: 'challenge',
		name: '闯关',
		description: '连续答题闯关模式',
		icon: TargetIcon,
		color: 'var(--color-success)'
	}
];

export default function SelectGameTypePage() {
	const router = useRouter();
	const { isAuthenticated, user } = useAuth();
	const [selectedType, setSelectedType] = useState<GameType | null>(null);
	const [isAdminMode, setIsAdminMode] = useState(false);

	const isAdmin = user?.role === 'admin';

	if (!isAuthenticated) {
		return (
			<main style={{
				padding: 'var(--spacing-xl)',
				maxWidth: 800,
				margin: '0 auto',
				textAlign: 'center'
			}}>
				<p style={{ color: 'var(--color-text-secondary)' }}>
					请先登录以创建游戏
				</p>
			</main>
		);
	}

	const handleSelectType = (type: GameType) => {
		// 跳转到创建页面，带上类型参数
		router.push(`/workshop/create/form?type=${type.id}`);
	};

	const handleViewStats = (item: string) => {
		if (item === 'baike') {
			router.push('/workshop/create/admin/baike/stats');
		}
	};

	// 官方游戏统计项目
	const officialGames = [
		{
			id: 'baike',
			name: '每日百科',
			description: '查看每日百科游戏统计数据',
			icon: BookIcon,
			color: 'var(--color-primary)'
		}
	];

	return (
		<main style={{
			padding: 'var(--spacing-xl)',
			maxWidth: 1400,
			margin: '0 auto',
			background: 'var(--color-background)',
			minHeight: 'calc(100vh - 200px)'
		}}>
			{/* 页面标题 */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				marginBottom: 'var(--spacing-xxl)'
			}}>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-md)'
				}}>
					<div style={{
						width: '48px',
						height: '48px',
						borderRadius: 'var(--radius-md)',
						background: isAdminMode 
							? 'linear-gradient(135deg, var(--color-warning) 0%, #d97706 100%)'
							: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0
					}}>
						{isAdminMode ? (
							<ShieldIcon size={24} color="white" />
						) : (
							<GamepadIcon size={24} color="white" />
						)}
					</div>
					<div>
						<h1 style={{
							margin: 0,
							fontSize: 'var(--font-size-2xl)',
							fontWeight: 700,
							color: 'var(--color-text-primary)'
						}}>
							{isAdminMode ? '管理员编辑' : '创建游戏'}
						</h1>
						<p style={{
							margin: 0,
							fontSize: 'var(--font-size-sm)',
							color: 'var(--color-text-secondary)'
						}}>
							{isAdminMode ? '查看官方游戏统计数据' : '选择游戏类型开始创建'}
						</p>
					</div>
				</div>
				
				{/* 管理员切换按钮 */}
				{isAdmin && (
					<button
						type="button"
						onClick={() => setIsAdminMode(!isAdminMode)}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-xs)',
							padding: 'var(--spacing-sm) var(--spacing-md)',
							border: `1px solid ${isAdminMode ? 'var(--color-warning)' : 'var(--color-border)'}`,
							borderRadius: 'var(--radius-md)',
							background: isAdminMode ? 'rgba(255, 152, 0, 0.1)' : 'var(--color-background-paper)',
							color: isAdminMode ? '#e65100' : 'var(--color-text-primary)',
							cursor: 'pointer',
							fontSize: 'var(--font-size-sm)',
							transition: 'all var(--transition-fast)'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.transform = 'translateY(-2px)';
							e.currentTarget.style.boxShadow = 'var(--shadow-md)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.transform = 'translateY(0)';
							e.currentTarget.style.boxShadow = 'none';
						}}
					>
						<ShieldIcon size={16} color="currentColor" />
						<span>{isAdminMode ? '切换到创建' : '查看统计'}</span>
					</button>
				)}
			</div>

			{/* 类型选择网格 */}
			<div>
				<h2 style={{
					margin: 0,
					marginBottom: 'var(--spacing-lg)',
					fontSize: 'var(--font-size-xl)',
					fontWeight: 600,
					color: 'var(--color-text-primary)'
				}}>
					{isAdminMode ? '编辑内容' : '选择类型'}
				</h2>
				
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
					gap: 'var(--spacing-lg)'
				}}>
					{isAdminMode ? (
						// 管理员模式：显示官方游戏统计
						officialGames.map((item) => {
							const IconComponent = item.icon;
							return (
								<button
									key={item.id}
									type="button"
									onClick={() => handleViewStats(item.id)}
									style={{
										padding: 'var(--spacing-xl)',
										border: '2px solid var(--color-warning)',
										borderRadius: 'var(--radius-lg)',
										background: 'var(--color-background-paper)',
										cursor: 'pointer',
										transition: 'all var(--transition-fast)',
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: 'var(--spacing-md)',
										textAlign: 'center'
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.borderColor = item.color;
										e.currentTarget.style.background = 'rgba(255, 152, 0, 0.15)';
										e.currentTarget.style.transform = 'translateY(-4px)';
										e.currentTarget.style.boxShadow = 'var(--shadow-md)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.borderColor = 'var(--color-warning)';
										e.currentTarget.style.background = 'var(--color-background-paper)';
										e.currentTarget.style.transform = 'translateY(0)';
										e.currentTarget.style.boxShadow = 'none';
									}}
								>
									<div style={{
										width: '64px',
										height: '64px',
										borderRadius: 'var(--radius-full)',
										background: `linear-gradient(135deg, ${item.color}20 0%, ${item.color}10 100%)`,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										transition: 'all var(--transition-fast)'
									}}>
										<IconComponent
											size={32}
											color={item.color}
										/>
									</div>
									<div>
										<div style={{
											fontSize: 'var(--font-size-lg)',
											fontWeight: 600,
											color: 'var(--color-text-primary)',
											marginBottom: 'var(--spacing-xs)'
										}}>
											{item.name}
										</div>
										<div style={{
											fontSize: 'var(--font-size-xs)',
											color: 'var(--color-text-secondary)',
											lineHeight: 'var(--line-height-relaxed)'
										}}>
											{item.description}
										</div>
									</div>
								</button>
							);
						})
					) : (
						// 普通创建模式：显示所有游戏类型
						gameTypes.map((type) => {
							const IconComponent = type.icon;
							return (
								<button
									key={type.id}
									type="button"
									onClick={() => handleSelectType(type)}
									style={{
										padding: 'var(--spacing-xl)',
										border: '2px solid var(--color-border-light)',
										borderRadius: 'var(--radius-lg)',
										background: selectedType?.id === type.id
											? 'var(--color-primary-lighter)'
											: 'var(--color-background-paper)',
										cursor: 'pointer',
										transition: 'all var(--transition-fast)',
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: 'var(--spacing-md)',
										textAlign: 'center'
									}}
									onMouseEnter={(e) => {
										if (selectedType?.id !== type.id) {
											e.currentTarget.style.borderColor = type.color;
											e.currentTarget.style.background = 'var(--color-background-subtle)';
											e.currentTarget.style.transform = 'translateY(-4px)';
											e.currentTarget.style.boxShadow = 'var(--shadow-md)';
										}
									}}
									onMouseLeave={(e) => {
										if (selectedType?.id !== type.id) {
											e.currentTarget.style.borderColor = 'var(--color-border-light)';
											e.currentTarget.style.background = 'var(--color-background-paper)';
											e.currentTarget.style.transform = 'translateY(0)';
											e.currentTarget.style.boxShadow = 'none';
										}
									}}
								>
									<div style={{
										width: '64px',
										height: '64px',
										borderRadius: 'var(--radius-full)',
										background: selectedType?.id === type.id
											? type.color
											: `linear-gradient(135deg, ${type.color}20 0%, ${type.color}10 100%)`,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										transition: 'all var(--transition-fast)'
									}}>
										<IconComponent
											size={32}
											color={selectedType?.id === type.id ? '#ffffff' : type.color}
										/>
									</div>
									<div>
										<div style={{
											fontSize: 'var(--font-size-lg)',
											fontWeight: 600,
											color: 'var(--color-text-primary)',
											marginBottom: 'var(--spacing-xs)'
										}}>
											{type.name}
										</div>
										<div style={{
											fontSize: 'var(--font-size-xs)',
											color: 'var(--color-text-secondary)',
											lineHeight: 'var(--line-height-relaxed)'
										}}>
											{type.description}
										</div>
									</div>
								</button>
							);
						})
					)}
				</div>
			</div>
		</main>
	);
}
