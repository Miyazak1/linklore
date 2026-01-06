'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import SettingsPanel from '@/components/layout/SettingsPanel';
import { MenuIcon } from '@/components/ui/Icons';

export default function MainLayout({ children }: { children: React.ReactNode }) {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [sidebarWidth, setSidebarWidth] = useState(256);

	// 从 localStorage 读取侧边栏宽度
	useEffect(() => {
		const saved = localStorage.getItem('sidebar-collapsed');
		if (saved === 'true') {
			setSidebarWidth(64);
		}
	}, []);

	// 监听侧边栏宽度变化
	useEffect(() => {
		const handleToggle = () => {
			const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
			if (collapsed) {
				setSidebarWidth(64);
			} else {
				const savedWidth = localStorage.getItem('sidebar-width');
				setSidebarWidth(savedWidth ? parseInt(savedWidth, 10) : 256);
			}
		};

		const handleWidthChange = (e?: Event) => {
			const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
			if (!collapsed) {
				// 如果事件包含 detail，直接使用（拖拽过程中）
				if (e && 'detail' in e && typeof (e as CustomEvent).detail === 'number') {
					setSidebarWidth((e as CustomEvent).detail);
				} else {
					// 否则从 localStorage 读取
					const savedWidth = localStorage.getItem('sidebar-width');
					setSidebarWidth(savedWidth ? parseInt(savedWidth, 10) : 256);
				}
			}
		};

		// 监听自定义事件（同窗口内的变化）
		window.addEventListener('sidebar-toggle', handleToggle);
		window.addEventListener('sidebar-width-change', handleWidthChange);

		// 初始化宽度
		const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
		if (collapsed) {
			setSidebarWidth(64);
		} else {
			const savedWidth = localStorage.getItem('sidebar-width');
			if (savedWidth) {
				setSidebarWidth(parseInt(savedWidth, 10));
			}
		}

		// 定期检查（作为备用方案）
		const interval = setInterval(() => {
			const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
			if (collapsed) {
				if (sidebarWidth !== 64) {
					setSidebarWidth(64);
				}
			} else {
				const savedWidth = localStorage.getItem('sidebar-width');
				const expectedWidth = savedWidth ? parseInt(savedWidth, 10) : 256;
				if (Math.abs(sidebarWidth - expectedWidth) > 1) {
					setSidebarWidth(expectedWidth);
				}
			}
		}, 100);

		return () => {
			window.removeEventListener('sidebar-toggle', handleToggle);
			window.removeEventListener('sidebar-width-change', handleWidthChange);
			clearInterval(interval);
		};
	}, [sidebarWidth]);

	// 键盘快捷键支持
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// ESC: 关闭设置面板
			if (e.key === 'Escape' && settingsOpen) {
				setSettingsOpen(false);
				e.preventDefault();
			}
			
			// Ctrl/Cmd + , 或 Ctrl/Cmd + / : 切换设置面板
			if ((e.ctrlKey || e.metaKey) && (e.key === ',' || e.key === '/')) {
				e.preventDefault();
				setSettingsOpen(!settingsOpen);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [settingsOpen]);

	return (
		<div style={{
			display: 'flex',
			minHeight: '100vh',
			background: 'var(--color-background)'
		}}>
			{/* 左侧导航栏 */}
			<Sidebar />

			{/* 移动端菜单按钮 */}
			<button
				type="button"
				onClick={() => {
					window.dispatchEvent(new Event('open-mobile-menu'));
				}}
				className="mobile-menu-button"
				style={{
					position: 'fixed',
					top: 'var(--spacing-md)',
					left: 'var(--spacing-md)',
					zIndex: 99,
					padding: 'var(--spacing-sm)',
					borderRadius: 'var(--radius-md)',
					border: '1px solid var(--color-border-light)',
					background: 'var(--color-background-paper)',
					cursor: 'pointer',
					display: 'none',
					alignItems: 'center',
					justifyContent: 'center',
					boxShadow: 'var(--shadow-md)',
					transition: 'all var(--transition-fast)'
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.background = 'var(--color-background-subtle)';
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.background = 'var(--color-background-paper)';
				}}
			>
				<MenuIcon size={20} color="var(--color-text-primary)" />
			</button>

			{/* 主内容区 */}
			<main 
				className="main-content"
				style={{
					flex: 1,
					marginLeft: `${sidebarWidth}px`,
					marginRight: settingsOpen ? '320px' : '0',
					transition: 'margin-left var(--transition-normal), margin-right var(--transition-normal)',
					minHeight: '100vh',
					background: 'var(--color-background)',
					// 性能优化
					willChange: 'margin-left, margin-right'
				}}
			>
				{children}
			</main>

			{/* 右侧设置面板 */}
			<SettingsPanel 
				isOpen={settingsOpen} 
				onClose={() => setSettingsOpen(false)}
			/>
		</div>
	);
}










