'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createModuleLogger } from '@/lib/utils/logger';
import { ChatIcon } from '@/components/ui/Icons';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const log = createModuleLogger('ChatFloatingButton');

export default function ChatFloatingButton() {
	const router = useRouter();
	const pathname = usePathname();
	const { isAuthenticated, loading: authLoading } = useAuth();
	const [isNavigating, setIsNavigating] = useState(false);
	const [isPending, startTransition] = useTransition();

	// 如果是聊天页面，不显示悬浮球
	const isChatPage = pathname?.startsWith('/chat');
	
	// 如果未登录或正在加载，不显示悬浮球
	if (authLoading || !isAuthenticated || isChatPage) {
		return null;
	}

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		log.debug('点击悬浮球，跳转到 /chat');
		
		// 立即显示加载状态
		setIsNavigating(true);
		
		// 使用 startTransition 优化路由跳转
		startTransition(() => {
			router.push('/chat');
		});
		
		// 如果3秒后还在加载，重置状态（防止卡住）
		setTimeout(() => {
			setIsNavigating(false);
		}, 3000);
	};

	const isLoading = isNavigating || isPending;

	return (
		<>
			{/* 全局加载层 - 在点击后立即显示 */}
			{isLoading && (
				<LoadingSpinner 
					fullscreen 
					message="正在进入聊天..." 
				/>
			)}
			
			<button
				onClick={handleClick}
				type="button"
				disabled={isLoading}
				style={{
					position: 'fixed',
					bottom: '80px',
					right: '80px',
					width: '72px',
					height: '72px',
					borderRadius: '50%',
					background: isLoading ? 'var(--color-primary-light)' : 'var(--color-primary)',
					color: 'white',
					border: 'none',
					cursor: isLoading ? 'wait' : 'pointer',
					boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: '24px',
					zIndex: 9999,
					transition: 'all 0.3s ease',
					pointerEvents: 'auto',
					opacity: isLoading ? 0.8 : 1,
				}}
				onMouseEnter={(e) => {
					if (!isLoading) {
						e.currentTarget.style.transform = 'scale(1.1)';
						e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
					}
				}}
				onMouseLeave={(e) => {
					if (!isLoading) {
						e.currentTarget.style.transform = 'scale(1)';
						e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
					}
				}}
				title={isLoading ? "正在加载..." : "进入聊天"}
			>
				{isLoading ? (
					<LoadingSpinner size="sm" color="white" />
				) : (
					<ChatIcon size={32} color="white" />
				)}
			</button>
		</>
	);
}

