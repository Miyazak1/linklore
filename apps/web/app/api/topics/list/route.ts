import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get('page') || '1', 10);
		const limit = parseInt(searchParams.get('limit') || '20', 10);
		const discipline = searchParams.get('discipline') || null;
		const skip = (page - 1) * limit;

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
					author: { select: { email: true } },
					documents: {
						select: { id: true, createdAt: true },
						orderBy: { createdAt: 'desc' },
						take: 1
					},
					_count: {
						select: { documents: true }
					}
				}
			}),
			prisma.topic.count({ where })
		]);

		// Get unique disciplines for filter
		const disciplines = await prisma.topic.findMany({
			select: { discipline: true },
			where: { discipline: { not: null } },
			distinct: ['discipline']
		});

		return NextResponse.json({
			topics,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit)
			},
			disciplines: disciplines.map((d) => d.discipline).filter(Boolean)
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '获取话题列表失败' }, { status: 500 });
	}
}










