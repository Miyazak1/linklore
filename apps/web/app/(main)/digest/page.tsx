'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function DigestPage() {
	const { isAuthenticated, loading: authLoading } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!authLoading) {
			setLoading(false);
		}
	}, [authLoading]);

	if (loading || authLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="text-center">加载中...</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-6">周报摘要</h1>
			<p className="text-gray-600 dark:text-gray-400">
				周报摘要功能正在开发中，敬请期待。
			</p>
		</div>
	);
}

