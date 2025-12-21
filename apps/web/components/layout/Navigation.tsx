'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { createModuleLogger } from '@/lib/utils/logger';
import { 
	HomeIcon, 
	MessageIcon, 
	SearchIcon, 
	BookIcon, 
	LibraryIcon, 
	ChartIcon,
	MenuIcon,
	CloseIcon,
	UserIcon,
	SettingsIcon,
	LogOutIcon,
	LogInIcon,
	ChevronDownIcon,
	ShieldIcon
} from '@/components/ui/Icons';

const log = createModuleLogger('Navigation');

export default function Navigation() {
	const pathname = usePathname();
	const { user, isAuthenticated, loading: authLoading, refreshAuth } = useAuth();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	
	// 从Context获取用户信息
	const userEmail = user?.email || null;
	const userName = user?.name || null;
	const userAvatarUrl = user?.avatarUrl || null;
	const userRole = user?.role || null;

	// 组件挂载时刷新认证状态（单一请求源）
	// 使用ref跟踪是否已初始化，避免重复请求
	const hasInitializedRef = useRef(false);
	
	useEffect(() => {
		if (!hasInitializedRef.current) {
			hasInitializedRef.current = true;
			refreshAuth();
		}
	}, [refreshAuth]);

	// 监听auth:changed事件，刷新认证状态
	useEffect(() => {
		const handleAuthChange = () => {
			// 延迟一点再刷新，避免与触发事件的组件冲突
			setTimeout(() => {
				refreshAuth();
			}, 500); // 增加延迟到500ms，确保触发事件的组件完成请求
		};
		
		window.addEventListener('auth:changed', handleAuthChange);
		return () => {
			window.removeEventListener('auth:changed', handleAuthChange);
		};
	}, [refreshAuth]);

	// 点击外部区域关闭用户菜单
	useEffect(() => {
		if (!userMenuOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('[data-user-menu]')) {
				setUserMenuOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [userMenuOpen]);

	const navItems = [
		{ href: '/', label: '首页', icon: HomeIcon },
		{ href: '/upload', label: '讨论版', icon: MessageIcon },
		{ href: '/traces', label: '语义溯源', icon: SearchIcon },
		{ href: '/library', label: '图书馆', icon: LibraryIcon },
		{ href: '/digest', label: '周报摘要', icon: ChartIcon },
	];

	const isActive = (href: string) => {
		if (href === '/') {
			return pathname === '/';
		}
		return pathname?.startsWith(href);
	};

	const NavLink = ({ item, onClick }: { item: typeof navItems[0]; onClick?: () => void }) => {
		const IconComponent = item.icon;
		return (
			<Link
				href={item.href}
				onClick={onClick}
				style={{
					padding: 'var(--spacing-sm) var(--spacing-md)',
					borderRadius: 'var(--radius-md)',
					textDecoration: 'none',
					fontSize: 'var(--font-size-sm)',
					fontWeight: 500,
					color: isActive(item.href) 
						? 'var(--color-primary)' 
						: 'var(--color-text-secondary)',
					background: isActive(item.href)
						? 'var(--color-primary-lighter)'
						: 'transparent',
					border: isActive(item.href)
						? '1px solid var(--color-primary)'
						: '1px solid transparent',
					transition: 'all var(--transition-fast)',
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-xs)',
					whiteSpace: 'nowrap'
				}}
				onMouseEnter={(e) => {
					if (!isActive(item.href)) {
						e.currentTarget.style.background = 'var(--color-background-subtle)';
						e.currentTarget.style.color = 'var(--color-text-primary)';
					}
				}}
				onMouseLeave={(e) => {
					if (!isActive(item.href)) {
						e.currentTarget.style.background = 'transparent';
						e.currentTarget.style.color = 'var(--color-text-secondary)';
					}
				}}
			>
				<IconComponent 
					size={18} 
					color="currentColor"
					style={{ flexShrink: 0 }}
				/>
				<span>{item.label}</span>
			</Link>
		);
	};

	return (
		<nav style={{
			background: 'var(--color-background-paper)',
			borderBottom: '1px solid var(--color-border-light)',
			padding: 'var(--spacing-md) 0',
			position: 'sticky',
			top: 0,
			zIndex: 100,
			boxShadow: 'var(--shadow-sm)'
		}}>
			<div style={{
				maxWidth: 1400,
				margin: '0 auto',
				padding: '0 var(--spacing-xl)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				flexWrap: 'wrap',
				gap: 'var(--spacing-md)'
			}}>
				{/* Logo and Brand */}
				<Link href="/" style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-xs)',
					textDecoration: 'none',
					color: 'var(--color-primary)',
					fontSize: 'var(--font-size-xl)',
					fontWeight: 700,
					letterSpacing: '-0.02em',
					whiteSpace: 'nowrap',
					transition: 'opacity 0.2s'
				}}
				onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
				onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
				>
					<BookIcon size={24} color="var(--color-primary)" style={{ flexShrink: 0 }} />
					<span>Linklore</span>
				</Link>

				{/* Desktop Navigation Links */}
				<div style={{
					display: 'none',
					alignItems: 'center',
					gap: 'var(--spacing-xs)',
					flexWrap: 'wrap'
				}}
				className="nav-desktop"
				>
					{navItems.map((item) => (
						<NavLink key={item.href} item={item} />
					))}
				</div>

				{/* Mobile Menu Button */}
				<button
					type="button"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					style={{
						display: 'none',
						padding: 'var(--spacing-sm)',
						background: 'transparent',
						border: '1px solid var(--color-border)',
						borderRadius: 'var(--radius-md)',
						cursor: 'pointer',
						fontSize: 'var(--font-size-lg)'
					}}
					className="nav-mobile-toggle"
				>
					{mobileMenuOpen ? (
						<CloseIcon size={20} color="currentColor" />
					) : (
						<MenuIcon size={20} color="currentColor" />
					)}
				</button>

				{/* Right Side Actions */}
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-md)',
					flexWrap: 'wrap'
				}}
				className="nav-actions"
				>
					{!authLoading && isAuthenticated && (
						<div style={{ position: 'relative' }} data-user-menu>
							<button
								type="button"
								onClick={() => setUserMenuOpen(!userMenuOpen)}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = 'var(--color-background-subtle)';
								}}
								onMouseLeave={(e) => {
									if (!userMenuOpen) {
										e.currentTarget.style.background = 'transparent';
									}
								}}
								style={{
									padding: 'var(--spacing-xs)',
									borderRadius: '50%',
									border: '1px solid var(--color-border)',
									background: userMenuOpen
										? 'var(--color-background-subtle)'
										: 'transparent',
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									transition: 'all var(--transition-fast)',
									width: '40px',
									height: '40px'
								}}
							>
								<Avatar
									avatarUrl={userAvatarUrl}
									name={userName}
									email={userEmail || undefined}
									size={36}
								/>
							</button>

							{/* 下拉菜单 */}
							{userMenuOpen && (
								<div
									data-user-menu
									style={{
										position: 'absolute',
										top: '100%',
										right: 0,
										marginTop: 'var(--spacing-xs)',
										background: 'var(--color-background-paper)',
										border: '1px solid var(--color-border)',
										borderRadius: 'var(--radius-md)',
										boxShadow: 'var(--shadow-md)',
										minWidth: '180px',
										zIndex: 1000,
										overflow: 'hidden'
									}}
								>
									{/* 用户信息 */}
									<div style={{
										padding: 'var(--spacing-md)',
										borderBottom: '1px solid var(--color-border)',
										background: 'var(--color-background-subtle)',
										display: 'flex',
										alignItems: 'center',
										gap: 'var(--spacing-sm)'
									}}>
										<Avatar
											avatarUrl={userAvatarUrl}
											name={userName}
											email={userEmail || undefined}
											size={40}
										/>
										<div style={{ flex: 1, minWidth: 0 }}>
											{userName && (
												<div style={{
													fontSize: 'var(--font-size-sm)',
													fontWeight: 600,
													color: 'var(--color-text-primary)',
													marginBottom: 'var(--spacing-xs)',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap'
												}}>
													{userName}
												</div>
											)}
											{userEmail && (
												<div style={{
													fontSize: 'var(--font-size-xs)',
													color: 'var(--color-text-secondary)',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap'
												}}>
													{userEmail}
												</div>
											)}
										</div>
									</div>

									{/* 菜单项 */}
									<div style={{ padding: 'var(--spacing-xs) 0' }}>
										<Link
											href="/shelf"
											onClick={() => setUserMenuOpen(false)}
											style={{
												display: 'block',
												padding: 'var(--spacing-sm) var(--spacing-md)',
												textDecoration: 'none',
												fontSize: 'var(--font-size-sm)',
												color: isActive('/shelf')
													? 'var(--color-primary)'
													: 'var(--color-text-primary)',
												background: isActive('/shelf')
													? 'var(--color-primary-lighter)'
													: 'transparent',
												transition: 'all var(--transition-fast)'
											}}
											onMouseEnter={(e) => {
												if (!isActive('/shelf')) {
													e.currentTarget.style.background = 'var(--color-background-subtle)';
												}
											}}
											onMouseLeave={(e) => {
												if (!isActive('/shelf')) {
													e.currentTarget.style.background = 'transparent';
												}
											}}
										>
											<LibraryIcon size={16} color="currentColor" /> 我的书架
										</Link>
										<Link
											href="/settings/ai"
											onClick={() => setUserMenuOpen(false)}
											style={{
												display: 'block',
												padding: 'var(--spacing-sm) var(--spacing-md)',
												textDecoration: 'none',
												fontSize: 'var(--font-size-sm)',
												color: isActive('/settings')
													? 'var(--color-primary)'
													: 'var(--color-text-primary)',
												background: isActive('/settings')
													? 'var(--color-primary-lighter)'
													: 'transparent',
												transition: 'all var(--transition-fast)'
											}}
											onMouseEnter={(e) => {
												if (!isActive('/settings')) {
													e.currentTarget.style.background = 'var(--color-background-subtle)';
												}
											}}
											onMouseLeave={(e) => {
												if (!isActive('/settings')) {
													e.currentTarget.style.background = 'transparent';
												}
											}}
										>
											<SettingsIcon size={16} color="currentColor" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
											账号信息
										</Link>
										{userRole === 'admin' && (
											<Link
												href="/admin"
												onClick={() => setUserMenuOpen(false)}
												style={{
													display: 'block',
													padding: 'var(--spacing-sm) var(--spacing-md)',
													textDecoration: 'none',
													fontSize: 'var(--font-size-sm)',
													color: isActive('/admin')
														? 'var(--color-primary)'
														: 'var(--color-text-primary)',
													background: isActive('/admin')
														? 'var(--color-primary-lighter)'
														: 'transparent',
													borderTop: '1px solid var(--color-border)',
													marginTop: 'var(--spacing-xs)',
													paddingTop: 'var(--spacing-sm)',
													transition: 'all var(--transition-fast)'
												}}
												onMouseEnter={(e) => {
													if (!isActive('/admin')) {
														e.currentTarget.style.background = 'var(--color-background-subtle)';
													}
												}}
												onMouseLeave={(e) => {
													if (!isActive('/admin')) {
														e.currentTarget.style.background = 'transparent';
													}
												}}
											>
												<ShieldIcon size={16} color="currentColor" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
												管理面板
											</Link>
										)}
									</div>

									{/* 退出按钮 */}
									<div style={{
										borderTop: '1px solid var(--color-border)',
										padding: 'var(--spacing-xs) 0'
									}}>
										<button
											type="button"
											onClick={async () => {
												await fetch('/api/auth/signout', { method: 'POST' });
												window.location.href = '/';
											}}
											style={{
												width: '100%',
												padding: 'var(--spacing-sm) var(--spacing-md)',
												textAlign: 'left',
												background: 'transparent',
												border: 'none',
												fontSize: 'var(--font-size-sm)',
												color: 'var(--color-text-primary)',
												cursor: 'pointer',
												transition: 'all var(--transition-fast)'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = 'var(--color-background-subtle)';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = 'transparent';
											}}
										>
											<LogOutIcon size={16} color="currentColor" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
											退出
										</button>
									</div>
								</div>
							)}
						</div>
					)}
					{/* 加载中时不显示任何按钮，避免闪烁 */}
					{!authLoading && !isAuthenticated && (
						<>
							<Link
								href="/signin"
								className="btn-academic"
								style={{
									padding: 'var(--spacing-xs) var(--spacing-md)',
									fontSize: 'var(--font-size-sm)',
									textDecoration: 'none',
									cursor: 'pointer',
									position: 'relative',
									zIndex: 1
								}}
							>
								登录
							</Link>
							<Link
								href="/signup"
								className="btn-academic-primary"
								style={{
									padding: 'var(--spacing-xs) var(--spacing-md)',
									fontSize: 'var(--font-size-sm)',
									textDecoration: 'none',
									cursor: 'pointer',
									position: 'relative',
									zIndex: 1
								}}
							>
								注册
							</Link>
						</>
					)}
					<ThemeToggle />
				</div>
			</div>

			{/* Mobile Menu */}
			{mobileMenuOpen && (
				<div style={{
					display: 'none',
					flexDirection: 'column',
					gap: 'var(--spacing-sm)',
					padding: 'var(--spacing-md) var(--spacing-xl)',
					background: 'var(--color-background-subtle)',
					borderTop: '1px solid var(--color-border-light)'
				}}
				className="nav-mobile-menu"
				>
					{navItems.map((item) => (
						<NavLink 
							key={item.href} 
							item={item} 
							onClick={() => setMobileMenuOpen(false)}
						/>
					))}
					{!authLoading && isAuthenticated && (
						<>
							{/* 移动端：我的菜单 */}
							<div style={{
								width: '100%',
								borderTop: '1px solid var(--color-border)',
								paddingTop: 'var(--spacing-sm)',
								marginTop: 'var(--spacing-sm)'
							}}>
								<div style={{
									padding: 'var(--spacing-xs) var(--spacing-md)',
									fontSize: 'var(--font-size-xs)',
									color: 'var(--color-text-tertiary)',
									fontWeight: 600,
									marginBottom: 'var(--spacing-xs)'
								}}>
									我的
								</div>
								<Link
									href="/shelf"
									onClick={() => setMobileMenuOpen(false)}
									style={{
										display: 'block',
										padding: 'var(--spacing-sm) var(--spacing-md)',
										borderRadius: 'var(--radius-md)',
										textDecoration: 'none',
										fontSize: 'var(--font-size-sm)',
										fontWeight: 500,
										color: isActive('/shelf')
											? 'var(--color-primary)'
											: 'var(--color-text-secondary)',
										background: isActive('/shelf')
											? 'var(--color-primary-lighter)'
											: 'transparent',
										marginBottom: 'var(--spacing-xs)'
									}}
								>
									<LibraryIcon size={16} color="currentColor" /> 我的书架
								</Link>
								<Link
									href="/settings/ai"
									onClick={() => setMobileMenuOpen(false)}
									style={{
										display: 'block',
										padding: 'var(--spacing-sm) var(--spacing-md)',
										borderRadius: 'var(--radius-md)',
										textDecoration: 'none',
										fontSize: 'var(--font-size-sm)',
										fontWeight: 500,
										color: isActive('/settings')
											? 'var(--color-primary)'
											: 'var(--color-text-secondary)',
										background: isActive('/settings')
											? 'var(--color-primary-lighter)'
											: 'transparent',
										marginBottom: 'var(--spacing-xs)'
									}}
								>
									<SettingsIcon size={16} color="currentColor" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
									账号信息
								</Link>
								{userRole === 'admin' && (
									<Link
										href="/admin/users"
										onClick={() => setMobileMenuOpen(false)}
										style={{
											display: 'block',
											padding: 'var(--spacing-sm) var(--spacing-md)',
											borderRadius: 'var(--radius-md)',
											textDecoration: 'none',
											fontSize: 'var(--font-size-sm)',
											fontWeight: 500,
											color: isActive('/admin')
												? 'var(--color-primary)'
												: 'var(--color-text-secondary)',
											background: isActive('/admin')
												? 'var(--color-primary-lighter)'
												: 'transparent',
											marginBottom: 'var(--spacing-xs)'
										}}
									>
										<ShieldIcon size={16} color="currentColor" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
										管理面板
									</Link>
								)}
								{/* 移动端用户信息 */}
								<div style={{
									padding: 'var(--spacing-sm) var(--spacing-md)',
									display: 'flex',
									alignItems: 'center',
									gap: 'var(--spacing-sm)',
									borderTop: '1px solid var(--color-border)',
									marginTop: 'var(--spacing-xs)',
									paddingTop: 'var(--spacing-sm)'
								}}>
									<Avatar
										avatarUrl={userAvatarUrl}
										name={userName}
										email={userEmail || undefined}
										size={32}
									/>
									<div style={{ flex: 1, minWidth: 0 }}>
										{userName && (
											<div style={{
												fontSize: 'var(--font-size-sm)',
												fontWeight: 600,
												color: 'var(--color-text-primary)',
												marginBottom: 'var(--spacing-xs)',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap'
											}}>
												{userName}
											</div>
										)}
										{userEmail && (
											<div style={{
												fontSize: 'var(--font-size-xs)',
												color: 'var(--color-text-tertiary)',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap'
											}}>
												{userEmail}
											</div>
										)}
									</div>
								</div>
								<button
									type="button"
									onClick={async () => {
										await fetch('/api/auth/signout', { method: 'POST' });
										window.location.href = '/';
									}}
									className="btn-academic"
									style={{
										padding: 'var(--spacing-xs) var(--spacing-md)',
										fontSize: 'var(--font-size-sm)',
										width: '100%',
										textAlign: 'left'
									}}
								>
									<LogOutIcon size={16} color="currentColor" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
									退出
								</button>
							</div>
						</>
					)}
					{/* 加载中时不显示任何按钮，避免闪烁 */}
					{!authLoading && !isAuthenticated && (
						<>
							<Link
								href="/signin"
								onClick={() => setMobileMenuOpen(false)}
								className="btn-academic"
								style={{
									padding: 'var(--spacing-xs) var(--spacing-md)',
									fontSize: 'var(--font-size-sm)',
									textDecoration: 'none',
									width: '100%',
									textAlign: 'center',
									cursor: 'pointer',
									position: 'relative',
									zIndex: 1
								}}
							>
								登录
							</Link>
							<Link
								href="/signup"
								onClick={() => setMobileMenuOpen(false)}
								className="btn-academic-primary"
								style={{
									padding: 'var(--spacing-xs) var(--spacing-md)',
									fontSize: 'var(--font-size-sm)',
									textDecoration: 'none',
									width: '100%',
									textAlign: 'center',
									cursor: 'pointer',
									position: 'relative',
									zIndex: 1
								}}
							>
								注册
							</Link>
						</>
					)}
				</div>
			)}
		</nav>
	);
}

