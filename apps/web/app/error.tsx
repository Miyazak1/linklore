'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// 忽略 NEXT_REDIRECT 错误（这是 Next.js 的正常行为，不应该被错误边界捕获）
		if (error.message === 'NEXT_REDIRECT' || error.digest?.includes('NEXT_REDIRECT')) {
			console.log('[ErrorBoundary] Ignoring NEXT_REDIRECT error (expected behavior)');
			return;
		}
		
		// Log error to Sentry
		if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
			Sentry.captureException(error);
		}
		console.error('Application error:', error);
	}, [error]);
	
	// 如果是 NEXT_REDIRECT 错误，不显示错误界面
	if (error.message === 'NEXT_REDIRECT' || error.digest?.includes('NEXT_REDIRECT')) {
		return null;
	}

	return (
		<div style={{ padding: 48, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
			<h2 style={{ color: '#c62828', marginBottom: 16 }}>出错了</h2>
			<p style={{ color: '#666', marginBottom: 24 }}>
				{error.message || '发生了意外错误，请稍后重试。'}
			</p>
			<button
				onClick={reset}
				style={{
					padding: '12px 24px',
					background: '#1976d2',
					color: '#fff',
					border: 'none',
					borderRadius: 4,
					cursor: 'pointer',
					fontSize: '1em'
				}}
			>
				重试
			</button>
		</div>
	);
}










