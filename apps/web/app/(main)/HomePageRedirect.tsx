'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 客户端重定向组件
 * 用于在客户端导航时处理重定向，避免服务端 redirect 的错误
 */
export default function HomePageRedirect() {
	const router = useRouter();

	useEffect(() => {
		// 使用 replace 而不是 push，避免在历史记录中留下首页
		router.replace('/chat');
	}, [router]);

	// 显示加载状态
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				minHeight: '100vh',
				background: 'var(--color-background)',
			}}
		>
			<div style={{ textAlign: 'center' }}>
				<div
					style={{
						width: 40,
						height: 40,
						border: '3px solid var(--color-border)',
						borderTopColor: 'var(--color-primary)',
						borderRadius: '50%',
						animation: 'spin 1s linear infinite',
						margin: '0 auto 16px',
					}}
				/>
				<p style={{ color: 'var(--color-text-secondary)' }}>跳转中...</p>
			</div>
		</div>
	);
}










