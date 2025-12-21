// 暂时禁用语义溯源功能，后期改造后再启用
// 'use client';

// import { useState, useEffect } from 'react';
// import { useParams } from 'next/navigation';
// import TraceEditor from '@/components/trace/TraceEditor';
// import type { CitationData } from '@/components/trace/CitationManager';

export default function EditTracePage() {
	// const params = useParams();
	// const traceId = params.id as string;
	// const [initialData, setInitialData] = useState<any>(null);
	// const [loading, setLoading] = useState(true);

	// useEffect(() => {
	// 	loadTrace();
	// }, [traceId]);

	// const loadTrace = async () => {
	// 	try {
	// 		const res = await fetch(`/api/traces/${traceId}`);
	// 		const data = await res.json();

	// 		if (res.ok && data.success) {
	// 			const trace = data.data;
	// 			setInitialData({
	// 				title: trace.title,
	// 				traceType: trace.traceType,
	// 				target: trace.target,
	// 				body: trace.body,
	// 				version: trace.version,
	// 				citations: trace.citationsList.map((c: any) => ({
	// 					id: c.id,
	// 					url: c.url,
	// 					title: c.title,
	// 					author: c.author,
	// 					publisher: c.publisher,
	// 					year: c.year,
	// 					type: c.type,
	// 					quote: c.quote,
	// 					page: c.page,
	// 					order: c.order
	// 				}))
	// 			});
	// 		}
	// 	} catch (err) {
	// 		console.error('Failed to load trace:', err);
	// 	} finally {
	// 		setLoading(false);
	// 	}
	// };

	// if (loading) {
	// 	return (
	// 		<div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
	// 			<div>加载中...</div>
	// 		</div>
	// 	);
	// }

	// return <TraceEditor traceId={traceId} initialData={initialData} />;
	
	return (
		<div style={{
			maxWidth: 800,
			margin: '100px auto',
			padding: 'var(--spacing-xxl)',
			textAlign: 'center',
			background: 'var(--color-background-paper)',
			borderRadius: 'var(--radius-lg)',
			border: '1px solid var(--color-border-light)'
		}}>
			<h1 style={{
				fontSize: 'var(--font-size-2xl)',
				marginBottom: 'var(--spacing-lg)',
				color: 'var(--color-text-primary)'
			}}>功能暂时禁用</h1>
			<p style={{
				fontSize: 'var(--font-size-base)',
				color: 'var(--color-text-secondary)',
				lineHeight: 1.6
			}}>
				语义溯源功能正在改造中，敬请期待。
			</p>
		</div>
	);
}

