import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getCache, setCache } from '@/lib/cache/redis';

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get('page') || '1', 10);
		const limit = parseInt(searchParams.get('limit') || '20', 10);
		const discipline = searchParams.get('discipline') || null;
		const skip = (page - 1) * limit;

		// Cache key based on query parameters
		const cacheKey = `topics:list:${page}:${limit}:${discipline || 'all'}`;
		
		// Try to get from cache (cache for 60 seconds)
		const cached = await getCache<any>(cacheKey);
		if (cached) {
			return NextResponse.json(cached);
		}

		const where: any = {};
		if (discipline) {
			where.discipline = discipline;
		}

		const [topics, total] = await Promise.all([
			prisma.topic.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit,
				include: {
					author: { 
						select: { 
							email: true,
							name: true,
							avatarUrl: true
						} 
					},
					documents: {
						select: { id: true, createdAt: true },
						orderBy: { createdAt: 'desc' },
						take: 1
					},
					_count: {
						select: { 
							documents: true,
							comments: true // 添加评论数
						}
					}
				}
			}),
			prisma.topic.count({ where })
		]);

		// Get unique disciplines for filter (cache separately for longer)
		const disciplinesCacheKey = 'topics:disciplines';
		let disciplines = await getCache<string[]>(disciplinesCacheKey);
		
		if (!disciplines) {
			const disciplineResults = await prisma.topic.findMany({
				select: { discipline: true },
				where: { discipline: { not: null } },
				distinct: ['discipline']
			});
			disciplines = disciplineResults
				.map(r => r.discipline)
				.filter((d): d is string => d !== null);
			// Cache disciplines for 5 minutes
			await setCache(disciplinesCacheKey, disciplines, 300);
		}

		const response = {
			topics,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit)
			},
			disciplines
		};

		// Cache response for 60 seconds
		await setCache(cacheKey, response, 60);

		return NextResponse.json(response);
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '获取话题列表失败' }, { status: 500 });
	}
}










