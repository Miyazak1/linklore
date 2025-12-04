'use client';

import { lazy, Suspense } from 'react';

// Lazy load TopicList component
const TopicList = lazy(() => import('@/components/topic/TopicList'));

export default function LazyTopicList() {
	return (
		<Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: '#666' }}>加载中...</div>}>
			<TopicList />
		</Suspense>
	);
}










