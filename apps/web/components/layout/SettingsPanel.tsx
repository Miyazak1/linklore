'use client';

import { useState } from 'react';
import { SettingsIcon, CloseIcon } from '@/components/ui/Icons';
import { useTheme } from '@/lib/design/theme';
import ThemeToggle from '@/components/ui/ThemeToggle';

interface SettingsPanelProps {
	isOpen: boolean;
	onClose: () => void;
	children?: React.ReactNode;
}

interface SettingSectionProps {
	title: string;
	children: React.ReactNode;
}

function SettingSection({ title, children }: SettingSectionProps) {
	return (
		<div style={{
			marginBottom: 'var(--spacing-lg)'
		}}>
			<h3 style={{
				margin: 0,
				marginBottom: 'var(--spacing-md)',
				fontSize: 'var(--font-size-sm)',
				fontWeight: 600,
				color: 'var(--color-text-primary)',
				textTransform: 'uppercase',
				letterSpacing: '0.05em'
			}}>
				{title}
			</h3>
			{children}
		</div>
	);
}

interface SettingItemProps {
	label: string;
	description?: string;
	children: React.ReactNode;
}

function SettingItem({ label, description, children }: SettingItemProps) {
	return (
		<div style={{
			marginBottom: 'var(--spacing-md)',
			paddingBottom: 'var(--spacing-md)',
			borderBottom: '1px solid var(--color-border-light)'
		}}>
			<div style={{
				marginBottom: 'var(--spacing-xs)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between'
			}}>
				<div style={{ flex: 1 }}>
					<div style={{
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500,
						color: 'var(--color-text-primary)',
						marginBottom: description ? 'var(--spacing-xs)' : 0
					}}>
						{label}
					</div>
					{description && (
						<div style={{
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-secondary)',
							marginTop: 'var(--spacing-xs)'
						}}>
							{description}
						</div>
					)}
				</div>
				<div>
					{children}
				</div>
			</div>
		</div>
	);
}

export default function SettingsPanel({ isOpen, onClose, children }: SettingsPanelProps) {
	if (!isOpen) return null;

	const { theme } = useTheme();

	const keyboardShortcuts = [
		{ keys: ['Esc'], description: '关闭侧边栏/设置面板' },
		{ keys: ['Ctrl', 'B'], description: '切换侧边栏折叠', mac: ['Cmd', 'B'] },
		{ keys: ['Ctrl', '/'], description: '切换设置面板', mac: ['Cmd', '/'] },
		{ keys: ['Ctrl', ','], description: '切换设置面板', mac: ['Cmd', ','] },
	];

	const renderKey = (key: string) => {
		return (
			<kbd style={{
				padding: '2px 6px',
				fontSize: 'var(--font-size-xs)',
				fontFamily: 'var(--font-family-mono)',
				background: 'var(--color-background-subtle)',
				border: '1px solid var(--color-border)',
				borderRadius: 'var(--radius-sm)',
				color: 'var(--color-text-primary)',
				marginRight: '4px'
			}}>
				{key}
			</kbd>
		);
	};

	return (
		<aside
			style={{
				position: 'fixed',
				right: 0,
				top: 0,
				height: '100vh',
				width: '320px',
				background: 'var(--color-background-paper)',
				borderLeft: '1px solid var(--color-border-light)',
				display: 'flex',
				flexDirection: 'column',
				zIndex: 99,
				boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
				transition: 'transform var(--transition-normal)',
				transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
				// 性能优化
				willChange: 'transform',
				transformOrigin: 'right center',
				backfaceVisibility: 'hidden',
				WebkitBackfaceVisibility: 'hidden'
			}}
		>
			{/* 头部 */}
			<div style={{
				padding: 'var(--spacing-lg) var(--spacing-md)',
				borderBottom: '1px solid var(--color-border-light)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				minHeight: '64px'
			}}>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-sm)'
				}}>
					<SettingsIcon size={20} color="var(--color-text-primary)" />
					<h2 style={{
						margin: 0,
						fontSize: 'var(--font-size-lg)',
						fontWeight: 600,
						color: 'var(--color-text-primary)'
					}}>
						设置
					</h2>
				</div>
				<button
					type="button"
					onClick={onClose}
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
						transition: 'all var(--transition-fast)'
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
			</div>

			{/* 内容区域 */}
			<div style={{
				flex: 1,
				padding: 'var(--spacing-md)',
				overflowY: 'auto',
				overflowX: 'hidden'
			}}>
				{children || (
					<>
						{/* 外观设置 */}
						<SettingSection title="外观">
							<SettingItem
								label="主题"
								description="切换浅色/深色模式"
							>
								<ThemeToggle />
							</SettingItem>
							<SettingItem
								label="当前主题"
								description={`当前使用 ${theme === 'light' ? '浅色' : '深色'} 主题`}
							>
								<span style={{
									fontSize: 'var(--font-size-xs)',
									color: 'var(--color-text-secondary)',
									padding: '4px 8px',
									background: 'var(--color-background-subtle)',
									borderRadius: 'var(--radius-sm)'
								}}>
									{theme === 'light' ? '浅色' : '深色'}
								</span>
							</SettingItem>
						</SettingSection>

						{/* 快捷键 */}
						<SettingSection title="键盘快捷键">
							{keyboardShortcuts.map((shortcut, index) => {
								const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
								const keys = isMac && shortcut.mac ? shortcut.mac : shortcut.keys;
								
								return (
									<SettingItem
										key={index}
										label={shortcut.description}
									>
										<div style={{
											display: 'flex',
											alignItems: 'center',
											gap: '2px'
										}}>
											{keys.map((key, keyIndex) => (
												<span key={keyIndex}>
													{renderKey(key)}
													{keyIndex < keys.length - 1 && (
														<span style={{
															margin: '0 4px',
															color: 'var(--color-text-tertiary)'
														}}>+</span>
													)}
												</span>
											))}
										</div>
									</SettingItem>
								);
							})}
						</SettingSection>

						{/* 关于 */}
						<SettingSection title="关于">
							<div style={{
								fontSize: 'var(--font-size-xs)',
								color: 'var(--color-text-secondary)',
								lineHeight: 'var(--line-height-relaxed)'
							}}>
								<p style={{ margin: 0, marginBottom: 'var(--spacing-xs)' }}>
									Mooyu v1.0.0
								</p>
								<p style={{ margin: 0 }}>
									知识管理和讨论平台
								</p>
							</div>
						</SettingSection>
					</>
				)}
			</div>
		</aside>
	);
}

