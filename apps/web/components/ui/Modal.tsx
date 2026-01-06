'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/components/ui/Icons';

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	maxWidth?: string;
	showCloseButton?: boolean;
}

export default function Modal({ 
	isOpen, 
	onClose, 
	title, 
	children, 
	maxWidth = '480px',
	showCloseButton = true 
}: ModalProps) {
	const [mounted, setMounted] = useState(false);

	// 确保只在客户端渲染 Portal
	useEffect(() => {
		setMounted(true);
	}, []);

	// ESC 键关闭
	useEffect(() => {
		if (!isOpen) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen, onClose]);

	// 防止背景滚动
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		return () => {
			document.body.style.overflow = '';
		};
	}, [isOpen]);

	if (!isOpen || !mounted) return null;

	const modalContent = (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 10000,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '16px',
				background: 'rgba(0, 0, 0, 0.4)',
				backdropFilter: 'blur(8px)',
				opacity: isOpen ? 1 : 0,
				transition: 'opacity var(--transition-normal)',
				willChange: 'opacity'
			}}
			onClick={(e) => {
				// 点击遮罩层关闭
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				style={{
					background: 'var(--color-background-paper)',
					borderRadius: 'var(--radius-lg)',
					boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
					maxWidth: maxWidth,
					width: '100%',
					maxHeight: '90vh',
					overflow: 'hidden',
					position: 'relative',
					transform: isOpen ? 'scale(1)' : 'scale(0.98)',
					opacity: isOpen ? 1 : 0,
					transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
					willChange: 'transform, opacity'
				}}
				onClick={(e) => {
					// 阻止点击内容区域关闭
					e.stopPropagation();
				}}
			>
				{/* 头部 - 紧凑设计 */}
				{(title || showCloseButton) && (
					<div style={{
						padding: '16px 20px',
						borderBottom: '1px solid var(--color-border-light)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 'var(--spacing-md)',
						position: 'sticky',
						top: 0,
						background: 'var(--color-background-paper)',
						zIndex: 1
					}}>
						{title && (
							<h2 style={{
								margin: 0,
								fontSize: 'var(--font-size-lg)',
								fontWeight: 600,
								color: 'var(--color-text-primary)',
								letterSpacing: '-0.01em'
							}}>
								{title}
							</h2>
						)}
						{showCloseButton && (
							<button
								type="button"
								onClick={onClose}
								style={{
									padding: '6px',
									borderRadius: 'var(--radius-sm)',
									border: 'none',
									background: 'transparent',
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: 'var(--color-text-secondary)',
									transition: 'all 150ms',
									marginLeft: 'auto',
									width: '28px',
									height: '28px'
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
								<CloseIcon size={18} color="currentColor" />
							</button>
						)}
					</div>
				)}

				{/* 内容 - 紧凑内边距 */}
				<div style={{
					padding: title ? '24px' : '32px',
					overflow: 'auto',
					maxHeight: 'calc(90vh - 64px)'
				}}>
					{children}
				</div>
			</div>
		</div>
	);

	// 使用 Portal 渲染到 document.body，确保在整个页面中央显示
	return createPortal(modalContent, document.body);
}

