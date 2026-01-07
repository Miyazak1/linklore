'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { createModuleLogger } from '@/lib/utils/logger';
import SignInModal from '@/components/auth/SignInModal';
import SignUpModal from '@/components/auth/SignUpModal';
import { 
	HomeIcon, 
	MessageIcon, 
	SearchIcon, 
	BookIcon, 
	ChartIcon,
	UserIcon,
	SettingsIcon,
	LogOutIcon,
	LogInIcon,
	ShieldIcon,
	CloseIcon,
	GamepadIcon
} from '@/components/ui/Icons';

const log = createModuleLogger('Sidebar');

// 内部组件：使用 useSearchParams 的部分
function SidebarContent() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { user, isAuthenticated, loading: authLoading, refreshAuth } = useAuth();
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [sidebarWidth, setSidebarWidth] = useState(256);
	const [isResizing, setIsResizing] = useState(false);
	const [dragStartX, setDragStartX] = useState(0);
	const [dragStartWidth, setDragStartWidth] = useState(256);
	const [signInOpen, setSignInOpen] = useState(false);
	const [signUpOpen, setSignUpOpen] = useState(false);
	const userButtonRef = useRef<HTMLButtonElement>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
	
	// 从Context获取用户信息
	const userEmail = user?.email || null;
	const userName = user?.name || null;
	const userAvatarUrl = user?.avatarUrl || null;
	const userRole = user?.role || null;

	// 组件挂载时刷新认证状态
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
			refreshAuth(true);
		};
		
		window.addEventListener('auth:changed', handleAuthChange);
		return () => {
			window.removeEventListener('auth:changed', handleAuthChange);
		};
	}, [refreshAuth]);

	// 监听 URL 参数和自定义事件，自动打开登录/注册弹窗
	useEffect(() => {
		// 检查 URL 参数
		const shouldLogin = searchParams?.get('login') === 'true';
		if (shouldLogin && !authLoading && !isAuthenticated) {
			setSignInOpen(true);
			// 清理 URL 参数
			const url = new URL(window.location.href);
			url.searchParams.delete('login');
			window.history.replaceState({}, '', url.toString());
		}

		// 监听自定义事件
		const handleOpenSignIn = () => {
			setSignInOpen(true);
		};
		const handleOpenSignUp = () => {
			setSignUpOpen(true);
		};

		window.addEventListener('open-signin-modal', handleOpenSignIn);
		window.addEventListener('open-signup-modal', handleOpenSignUp);

		return () => {
			window.removeEventListener('open-signin-modal', handleOpenSignIn);
			window.removeEventListener('open-signup-modal', handleOpenSignUp);
		};
	}, [searchParams, authLoading, isAuthenticated]);

	// 点击外部区域关闭用户菜单
	useEffect(() => {
		if (!userMenuOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('[data-user-menu]')) {
				setUserMenuOpen(false);
				setMenuPosition(null);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [userMenuOpen]);

	// 当侧边栏收起状态改变或菜单打开时，重新计算菜单位置
	useEffect(() => {
		if (collapsed && userMenuOpen && userButtonRef.current) {
			const rect = userButtonRef.current.getBoundingClientRect();
			// 菜单显示在头像的右上角
			setMenuPosition({
				top: rect.top, // 与头像顶部对齐
				left: rect.right + 8 // 在头像右侧 8px
			});
		} else if (!collapsed) {
			setMenuPosition(null);
		}
	}, [collapsed, userMenuOpen]);

	// 从 localStorage 读取折叠状态和宽度
	useEffect(() => {
		const savedCollapsed = localStorage.getItem('sidebar-collapsed');
		if (savedCollapsed === 'true') {
			setCollapsed(true);
		}
		
		const savedWidth = localStorage.getItem('sidebar-width');
		if (savedWidth && !savedCollapsed) {
			const width = parseInt(savedWidth, 10);
			if (width >= 200 && width <= 400) {
				setSidebarWidth(width);
			}
		}
	}, []);

	// 拖拽调整宽度（使用 requestAnimationFrame 优化性能）
	useEffect(() => {
		if (!isResizing || isMobile || collapsed) return;

		let animationFrameId: number | null = null;
		let lastWidth = sidebarWidth;
		let lastEventTime = 0;
		const THROTTLE_MS = 16; // ~60fps

		const handleMouseMove = (e: MouseEvent) => {
			const now = Date.now();
			if (now - lastEventTime < THROTTLE_MS) {
				return;
			}
			lastEventTime = now;

			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}

			animationFrameId = requestAnimationFrame(() => {
				const diff = e.clientX - dragStartX;
				const newWidth = Math.max(200, Math.min(400, dragStartWidth + diff));
				
				// 只有当宽度变化超过 1px 时才更新，减少重绘
				if (Math.abs(newWidth - lastWidth) >= 1) {
					setSidebarWidth(newWidth);
					lastWidth = newWidth;
					// 实时通知 layout 更新（节流）
					localStorage.setItem('sidebar-width', String(newWidth));
					window.dispatchEvent(new CustomEvent('sidebar-width-change', { detail: newWidth }));
				}
			});
		};

		const handleMouseUp = () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
			setIsResizing(false);
			// 最终保存宽度到 localStorage
			localStorage.setItem('sidebar-width', String(sidebarWidth));
			// 触发事件通知 layout 最终更新
			window.dispatchEvent(new Event('sidebar-width-change'));
		};

		if (isResizing) {
			document.addEventListener('mousemove', handleMouseMove, { passive: true });
			document.addEventListener('mouseup', handleMouseUp);
			// 防止文本选择
			document.body.style.userSelect = 'none';
			document.body.style.cursor = 'col-resize';
			// 优化滚动性能
			document.body.style.overflow = 'hidden';
		}

		return () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.body.style.userSelect = '';
			document.body.style.cursor = '';
			document.body.style.overflow = '';
		};
	}, [isResizing, dragStartX, dragStartWidth, isMobile, collapsed, sidebarWidth]);

	const handleResizeStart = (e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
		setDragStartX(e.clientX);
		setDragStartWidth(sidebarWidth);
	};

	// 检测移动端
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768);
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => {
			window.removeEventListener('resize', checkMobile);
		};
	}, []);

	// 监听移动端菜单打开事件
	useEffect(() => {
		const handleOpenMobileMenu = () => {
			if (isMobile) {
				setMobileOpen(true);
			}
		};

		window.addEventListener('open-mobile-menu', handleOpenMobileMenu);
		return () => {
			window.removeEventListener('open-mobile-menu', handleOpenMobileMenu);
		};
	}, [isMobile]);

	// 监听路径变化，自动关闭移动端侧边栏
	useEffect(() => {
		if (isMobile && mobileOpen) {
			setMobileOpen(false);
		}
	}, [pathname, isMobile]);

	// 保存折叠状态
	const toggleCollapse = useCallback(() => {
		const newCollapsed = !collapsed;
		setCollapsed(newCollapsed);
		localStorage.setItem('sidebar-collapsed', String(newCollapsed));
		// 触发自定义事件，通知 layout 更新
		window.dispatchEvent(new Event('sidebar-toggle'));
	}, [collapsed]);

	// 键盘快捷键支持
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// ESC: 关闭移动端侧边栏
			if (e.key === 'Escape' && isMobile && mobileOpen) {
				setMobileOpen(false);
				e.preventDefault();
			}
			
			// Ctrl/Cmd + B: 切换侧边栏折叠状态（桌面端）
			if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !isMobile) {
				e.preventDefault();
				toggleCollapse();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [isMobile, mobileOpen, toggleCollapse]);

	// 侧边栏实际宽度（折叠时固定为 64，否则使用 sidebarWidth）
	const actualWidth = collapsed ? 64 : sidebarWidth;

	const navItems = [
		{ href: '/', label: '首页', icon: HomeIcon },
		{ href: '/discussion', label: '讨论版', icon: MessageIcon },
		{ href: '/workshop', label: '游戏工坊', icon: GamepadIcon },
		{ href: '/digest', label: '周报摘要', icon: ChartIcon },
	];

	const isActive = (href: string) => {
		if (href === '/') {
			return pathname === '/';
		}
		return pathname?.startsWith(href);
	};

	return (
		<>
			{/* 移动端遮罩层 */}
			<div
				style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'rgba(0, 0, 0, 0.5)',
					zIndex: 98,
					display: mobileOpen ? 'block' : 'none',
					opacity: mobileOpen ? 1 : 0,
					transition: 'opacity var(--transition-normal)',
					// 性能优化
					willChange: 'opacity',
					pointerEvents: mobileOpen ? 'auto' : 'none'
				}}
				className="sidebar-overlay"
				onClick={() => setMobileOpen(false)}
			/>
			<aside 
				style={{
					position: 'fixed',
					left: 0,
					top: 0,
					height: '100vh',
					width: `${actualWidth}px`,
					background: 'var(--color-background-paper)',
					borderRight: '1px solid var(--color-border-light)',
					display: 'flex',
					flexDirection: 'column',
					transition: isResizing ? 'none' : 'width var(--transition-normal), transform var(--transition-normal)',
					zIndex: 100,
					overflow: 'hidden', // 保持 hidden，但底部区域会设置为 visible
					// 移动端：默认隐藏，通过 transform 显示
					transform: isMobile 
						? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)')
						: 'translateX(0)',
					// 性能优化
					willChange: isResizing || isMobile ? 'width, transform' : 'auto',
					// GPU 加速
					transformOrigin: 'left center',
					backfaceVisibility: 'hidden',
					WebkitBackfaceVisibility: 'hidden'
				}}
				className="sidebar-container"
			>
			{/* Logo 区域 */}
			<div style={{
				padding: collapsed ? 'var(--spacing-md)' : 'var(--spacing-lg) var(--spacing-md)',
				borderBottom: '1px solid var(--color-border-light)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: collapsed ? 'center' : 'space-between',
				gap: 'var(--spacing-sm)',
				minHeight: '64px'
			}}>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-md)',
					flex: 1,
					minWidth: 0,
					paddingLeft: collapsed ? '0' : 'var(--spacing-sm)'
				}}>
					{/* Logo 图片或图标 */}
					<img
						src="/assets/icon.png"
						alt="Mooyu"
						onError={(e) => {
							// 如果图片加载失败，隐藏图片，显示图标
							e.currentTarget.style.display = 'none';
							const iconElement = e.currentTarget.nextElementSibling as HTMLElement;
							if (iconElement) {
								iconElement.style.display = 'flex';
							}
						}}
						style={{
							height: '32px',
							width: 'auto',
							flexShrink: 0,
							display: 'block'
						}}
					/>
					<div
						style={{
							display: 'none',
							flexShrink: 0
						}}
					>
						<BookIcon 
							size={32} 
							color="var(--color-primary)" 
						/>
					</div>
					{!collapsed && (
						<Link 
							href="/" 
							onClick={() => {
								if (isMobile) {
									setMobileOpen(false);
								}
							}}
							style={{
								textDecoration: 'none',
								color: '#4A4A4A',
								fontSize: 'var(--font-size-xl)',
								fontWeight: 700,
								letterSpacing: '-0.02em',
								whiteSpace: 'nowrap'
							}}
						>
							Mooyu
						</Link>
					)}
				</div>
				{/* 移动端关闭按钮 */}
				{isMobile && !collapsed && (
					<button
						type="button"
						onClick={() => setMobileOpen(false)}
						style={{
							padding: 'var(--spacing-xs)',
							borderRadius: 'var(--radius-md)',
							border: 'none',
							background: 'transparent',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: 'var(--color-text-secondary)',
							transition: 'all var(--transition-fast)',
							flexShrink: 0
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'var(--color-background-subtle)';
							e.currentTarget.style.color = 'var(--color-text-primary)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'transparent';
							e.currentTarget.style.color = 'var(--color-text-secondary)';
						}}
					>
						<CloseIcon size={20} color="currentColor" />
					</button>
				)}
			</div>

			{/* 导航菜单 */}
			<nav style={{
				flex: 1,
				padding: 'var(--spacing-md)',
				overflowY: 'auto',
				overflowX: 'hidden'
			}}>
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 'var(--spacing-xs)'
				}}>
					{navItems.map((item) => {
						const IconComponent = item.icon;
						const active = isActive(item.href);
						
						return (
							<Link
								key={item.href}
								href={item.href}
								title={collapsed ? item.label : undefined}
								onClick={() => {
									// 移动端点击链接后关闭侧边栏
									if (isMobile) {
										setMobileOpen(false);
									}
								}}
								style={{
									padding: collapsed ? '8px' : '8px 12px',
									borderRadius: '8px',
									textDecoration: 'none',
									fontSize: '14px',
									fontWeight: active ? 500 : 400,
									color: active 
										? '#2E3038' 
										: '#2E3038',
									background: active
										? 'rgba(255, 107, 107, 0.12)'
										: 'transparent',
									transition: 'all var(--transition-fast)',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
									justifyContent: collapsed ? 'center' : 'flex-start',
									whiteSpace: 'nowrap',
									position: 'relative'
								}}
								onMouseEnter={(e) => {
									if (!active) {
										e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
										e.currentTarget.style.color = '#2E3038';
									}
								}}
								onMouseLeave={(e) => {
									if (!active) {
										e.currentTarget.style.background = 'transparent';
										e.currentTarget.style.color = '#2E3038';
									}
								}}
							>
								<IconComponent 
									size={20} 
									color="currentColor"
									style={{ flexShrink: 0 }} 
								/>
								{!collapsed && <span>{item.label}</span>}
							</Link>
						);
					})}
				</div>
			</nav>

			{/* 底部区域：用户信息、设置、折叠按钮 */}
			<div style={{
				padding: collapsed ? 'var(--spacing-sm)' : 'var(--spacing-md)',
				borderTop: '1px solid var(--color-border-light)',
				display: 'flex',
				flexDirection: 'column',
				gap: collapsed ? 'var(--spacing-xs)' : 'var(--spacing-sm)',
				overflow: 'visible', // 允许菜单溢出显示
				position: 'relative'
			}}>
				{/* 用户信息 */}
				{!authLoading && isAuthenticated && (
					<div style={{ position: collapsed ? 'static' : 'relative', zIndex: 10 }} data-user-menu>
						<button
							ref={userButtonRef}
							type="button"
							onClick={() => {
								if (collapsed && !userMenuOpen) {
									// 计算菜单位置（显示在右上角）
									if (userButtonRef.current) {
										const rect = userButtonRef.current.getBoundingClientRect();
										setMenuPosition({
											top: rect.top, // 与头像顶部对齐
											left: rect.right + 8 // 在头像右侧 8px
										});
									}
								}
								setUserMenuOpen(!userMenuOpen);
							}}
							style={{
								width: collapsed ? '48px' : '100%',
								height: collapsed ? '48px' : 'auto',
								padding: collapsed ? '0' : 'var(--spacing-sm) var(--spacing-md)',
								borderRadius: collapsed ? '50%' : 'var(--radius-lg)',
								border: collapsed 
									? '2px solid #FF6B6B' // 收起时使用高亮边框（主题色）
									: 'none',
								background: userMenuOpen
									? 'rgba(0, 0, 0, 0.06)'
									: 'rgba(0, 0, 0, 0.04)',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								gap: 'var(--spacing-sm)',
								justifyContent: collapsed ? 'center' : 'flex-start',
								transition: 'all var(--transition-fast)',
								boxShadow: collapsed && userMenuOpen ? 'var(--shadow-sm)' : 'none',
								margin: collapsed ? '0 auto' : '0',
								position: 'relative',
								zIndex: 1
							}}
							onMouseEnter={(e) => {
								if (!userMenuOpen) {
									e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
									if (collapsed) {
										e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
									}
								}
							}}
							onMouseLeave={(e) => {
								if (!userMenuOpen) {
									e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
									if (collapsed) {
										e.currentTarget.style.boxShadow = 'none';
									}
								}
							}}
						>
							<Avatar
								avatarUrl={userAvatarUrl}
								name={userName}
								email={userEmail || undefined}
								size={collapsed ? 40 : 32}
							/>
							{!collapsed && (
								<div style={{ 
									flex: 1, 
									minWidth: 0,
									textAlign: 'left',
									overflow: 'hidden'
								}}>
									{userName && (
										<div style={{
											fontSize: 'var(--font-size-sm)',
											fontWeight: 600,
											color: 'var(--color-text-primary)',
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
							)}
						</button>

						{/* 用户下拉菜单 */}
						{userMenuOpen && (collapsed && menuPosition ? createPortal(
								<div
									data-user-menu
									style={{
										position: 'fixed',
										top: `${menuPosition.top}px`,
										left: `${menuPosition.left}px`,
										background: 'var(--color-background-paper)',
										border: '1px solid var(--color-border)',
										borderRadius: 'var(--radius-md)',
										boxShadow: 'var(--shadow-md)',
										width: '200px',
										minWidth: '200px',
										zIndex: 10001, // 使用 Portal 渲染到 body，确保显示在最上层
										overflow: 'hidden'
									}}
								>
								{/* 菜单项 */}
								<div style={{ padding: 'var(--spacing-xs) 0' }}>
									<Link
										href="/settings/ai"
										onClick={() => {
											setUserMenuOpen(false);
											if (isMobile) {
												setMobileOpen(false);
											}
										}}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 'var(--spacing-sm)',
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
										<SettingsIcon size={16} color="currentColor" />
										<span>账号信息</span>
									</Link>
									{userRole === 'admin' && (
										<Link
											href="/admin"
											onClick={() => {
												setUserMenuOpen(false);
												if (isMobile) {
													setMobileOpen(false);
												}
											}}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: 'var(--spacing-sm)',
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
											<ShieldIcon size={16} color="currentColor" />
											<span>管理面板</span>
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
											display: 'flex',
											alignItems: 'center',
											gap: 'var(--spacing-sm)',
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
										<LogOutIcon size={16} color="currentColor" />
										<span>退出</span>
									</button>
								</div>
							</div>
							, document.body) : (
								<div
									data-user-menu
									style={{
										position: 'absolute',
										bottom: '100%',
										left: 0,
										marginBottom: 'var(--spacing-xs)',
										background: 'var(--color-background-paper)',
										border: '1px solid var(--color-border)',
										borderRadius: 'var(--radius-md)',
										boxShadow: 'var(--shadow-md)',
										width: '100%',
										minWidth: '200px',
										zIndex: 1000,
										overflow: 'hidden'
									}}
								>
									{/* 菜单项 */}
									<div style={{ padding: 'var(--spacing-xs) 0' }}>
										<Link
											href="/settings/ai"
											onClick={() => {
												setUserMenuOpen(false);
												if (isMobile) {
													setMobileOpen(false);
												}
											}}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: 'var(--spacing-sm)',
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
											<SettingsIcon size={16} color="currentColor" />
											<span>账号信息</span>
										</Link>
										{userRole === 'admin' && (
											<Link
												href="/admin"
												onClick={() => {
													setUserMenuOpen(false);
													if (isMobile) {
														setMobileOpen(false);
													}
												}}
												style={{
													display: 'flex',
													alignItems: 'center',
													gap: 'var(--spacing-sm)',
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
												<ShieldIcon size={16} color="currentColor" />
												<span>管理面板</span>
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
												display: 'flex',
												alignItems: 'center',
												gap: 'var(--spacing-sm)',
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
											<LogOutIcon size={16} color="currentColor" />
											<span>退出</span>
										</button>
									</div>
								</div>
							))}
					</div>
				)}

				{/* 未登录状态 - 只显示登录入口 */}
				{!authLoading && !isAuthenticated && (
					<button
						type="button"
						title={collapsed ? '登录' : undefined}
						onClick={() => {
							setSignInOpen(true);
							if (isMobile) {
								setMobileOpen(false);
							}
						}}
						style={{
							width: collapsed ? '48px' : '100%',
							height: collapsed ? '48px' : 'auto',
							padding: collapsed ? '0' : 'var(--spacing-sm) var(--spacing-md)',
							fontSize: 'var(--font-size-sm)',
							textAlign: 'center',
							borderRadius: collapsed ? '50%' : 'var(--radius-md)',
							border: 'none',
							background: 'var(--color-primary)',
							color: '#ffffff',
							transition: 'all var(--transition-fast)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							fontFamily: 'inherit',
							fontWeight: 500,
							gap: 'var(--spacing-xs)',
							boxShadow: collapsed ? 'var(--shadow-sm)' : 'none',
							margin: collapsed ? '0 auto' : '0'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.opacity = '0.9';
							e.currentTarget.style.transform = collapsed ? 'scale(1.05)' : 'translateY(-1px)';
							e.currentTarget.style.boxShadow = 'var(--shadow-md)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.opacity = '1';
							e.currentTarget.style.transform = 'none';
							e.currentTarget.style.boxShadow = collapsed ? 'var(--shadow-sm)' : 'none';
						}}
					>
						<LogInIcon size={collapsed ? 20 : 18} color="currentColor" />
						{!collapsed && <span>登录</span>}
					</button>
				)}

				{/* 折叠按钮和主题切换 */}
				<div style={{
					display: 'flex',
					gap: collapsed ? 'var(--spacing-xs)' : 'var(--spacing-xs)',
					alignItems: 'center',
					flexDirection: collapsed ? 'column' : 'row'
				}}>
					<button
						type="button"
						onClick={toggleCollapse}
						title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
						style={{
							flex: collapsed ? 'none' : 1,
							width: collapsed ? '48px' : 'auto',
							height: collapsed ? '48px' : 'auto',
							padding: collapsed ? '0' : 'var(--spacing-sm)',
							borderRadius: collapsed ? '50%' : 'var(--radius-md)',
							border: '1px solid var(--color-border-light)',
							background: 'transparent',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							transition: 'all var(--transition-fast)',
							color: 'var(--color-text-secondary)',
							minWidth: collapsed ? 'auto' : '60px',
							margin: collapsed ? '0 auto' : '0'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'var(--color-background-subtle)';
							e.currentTarget.style.color = 'var(--color-text-primary)';
							e.currentTarget.style.borderColor = 'var(--color-primary)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'transparent';
							e.currentTarget.style.color = 'var(--color-text-secondary)';
							e.currentTarget.style.borderColor = 'var(--color-border-light)';
						}}
					>
						{/* 简单的折叠图标：使用文字符号 */}
						<span style={{ 
							fontSize: collapsed ? 'var(--font-size-base)' : 'var(--font-size-lg)',
							fontWeight: collapsed ? 500 : 400
						}}>
							{collapsed ? '→' : '←'}
						</span>
					</button>
					<ThemeToggle collapsed={collapsed} />
				</div>
			</div>
			
			{/* 登录/注册 Modal */}
			<SignInModal
				isOpen={signInOpen}
				onClose={() => setSignInOpen(false)}
				onSwitchToSignUp={() => {
					setSignInOpen(false);
					setSignUpOpen(true);
				}}
			/>
			<SignUpModal
				isOpen={signUpOpen}
				onClose={() => setSignUpOpen(false)}
				onSwitchToSignIn={() => {
					setSignUpOpen(false);
					setSignInOpen(true);
				}}
			/>
			
			{/* 拖拽调整手柄（桌面端，未折叠时显示） */}
			{!isMobile && !collapsed && (
				<div
					onMouseDown={handleResizeStart}
					style={{
						position: 'absolute',
						right: 0,
						top: 0,
						bottom: 0,
						width: '4px',
						cursor: 'col-resize',
						background: 'transparent',
						transition: 'background var(--transition-fast)',
						zIndex: 10
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = 'var(--color-primary)';
					}}
					onMouseLeave={(e) => {
						if (!isResizing) {
							e.currentTarget.style.background = 'transparent';
						}
					}}
				/>
			)}
		</aside>
		</>
	);
}

// 导出组件：用 Suspense 包裹以支持 useSearchParams
export default function Sidebar() {
	return (
		<Suspense fallback={
			<aside 
				style={{
					position: 'fixed',
					left: 0,
					top: 0,
					height: '100vh',
					width: '256px',
					background: 'var(--color-background-paper)',
					borderRight: '1px solid var(--color-border-light)',
					display: 'flex',
					flexDirection: 'column',
					zIndex: 100
				}}
			>
				<div style={{
					padding: 'var(--spacing-lg) var(--spacing-md)',
					borderBottom: '1px solid var(--color-border-light)',
					minHeight: '64px'
				}} />
			</aside>
		}>
			<SidebarContent />
		</Suspense>
	);
}
