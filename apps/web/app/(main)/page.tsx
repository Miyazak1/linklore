'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
	const router = useRouter();

	useEffect(() => {
		// 首页重定向到聊天室（客户端重定向）
		router.replace('/chat');
	}, [router]);

	// 显示加载状态
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				height: '100vh',
				background: 'var(--color-background)'
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
						margin: '0 auto 16px'
					}}
				/>
				<p style={{ color: 'var(--color-text-secondary)' }}>跳转中...</p>
			</div>
		</div>
	);
}


