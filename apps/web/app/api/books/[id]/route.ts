import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('Books Detail API');

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		
		const book = await prisma.book.findUnique({
			where: { id },
			include: {
				assets: {
					orderBy: { createdAt: 'desc' },
					select: {
						id: true,
						fileKey: true,
						mime: true
					}
				}
			}
		});

		if (!book) {
			return NextResponse.json({ error: '图书不存在' }, { status: 404 });
		}

		// Convert Date to ISO string
		const bookForClient = {
			...book,
			createdAt: book.createdAt.toISOString(),
			assets: book.assets.map(asset => ({
				...asset
			}))
		};

		return NextResponse.json({ book: bookForClient });
	} catch (error: any) {
		log.error('获取图书详情失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '获取图书详情失败' },
			{ status: 500 }
		);
	}
}







