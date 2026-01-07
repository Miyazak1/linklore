import { prisma } from '@/lib/db/client';
import NewHomePage from '@/components/ui/NewHomePage';
import { getCache, setCache } from '@/lib/cache/redis';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('HomePage');

export default async function HomePage() {
	try {
		// Get statistics with caching
		const cacheKey = 'home:stats';
		let cached: { topics: number; documents: number; users: number } | null = null;
		
		try {
			cached = await getCache<{ topics: number; documents: number; users: number }>(cacheKey);
		} catch (cacheErr) {
			log.warn('Cache error (non-fatal)', { error: cacheErr });
		}
		
		let totalTopics: number;
		let totalDocuments: number;
		let totalUsers: number;
		
		if (cached) {
			totalTopics = cached.topics;
			totalDocuments = cached.documents;
			totalUsers = cached.users;
		} else {
			try {
				// Fetch all counts in parallel
				[totalTopics, totalDocuments, totalUsers] = await Promise.all([
					prisma.topic.count(),
					prisma.document.count(),
					prisma.user.count()
				]);
				
				// Cache for 5 minutes (non-blocking)
				try {
					await setCache(cacheKey, { 
						topics: totalTopics, 
						documents: totalDocuments, 
						users: totalUsers
					}, 300);
				} catch (setCacheErr) {
					log.warn('Set cache error (non-fatal)', { error: setCacheErr });
				}
			} catch (dbErr) {
				log.error('Database error', dbErr);
				// Fallback values if database fails
				totalTopics = 0;
				totalDocuments = 0;
				totalUsers = 0;
			}
		}

		return (
			<main style={{ 
				background: 'var(--color-background)',
				minHeight: '100vh'
			}}>
				<NewHomePage stats={{ 
					totalTopics, 
					totalDocuments, 
					totalUsers
				}} />
			</main>
		);
	} catch (err: any) {
		log.error('Unexpected error', err);
		// Return a basic error page instead of crashing
		return (
			<main style={{ 
				padding: 'var(--spacing-xl)', 
				maxWidth: 1200, 
				margin: '0 auto',
				background: 'var(--color-background)'
			}}>
				<div style={{ padding: 48, textAlign: 'center' }}>
					<h1 style={{ color: 'var(--color-error)', marginBottom: 16 }}>页面加载错误</h1>
					<p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
						{process.env.NODE_ENV === 'development' ? String(err.message) : '请稍后重试'}
					</p>
					<a
						href="/"
						style={{
							display: 'inline-block',
							padding: '12px 24px',
							background: 'var(--color-primary)',
							color: '#fff',
							border: 'none',
							borderRadius: 4,
							cursor: 'pointer',
							textDecoration: 'none'
						}}
					>
						返回首页
					</a>
				</div>
			</main>
		);
	}
}


