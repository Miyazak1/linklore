import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';
import { z } from 'zod';

const log = createModuleLogger('Books List API');

const querySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(50),
	sort: z.enum(['latest', 'title', 'author']).default('latest'),
	search: z.string().nullish(),
	category: z.string().nullish(),
	tag: z.string().nullish(),
	language: z.string().nullish(),
	author: z.string().nullish(),
	hasAssets: z.preprocess(
		(val) => {
			// 如果值为 null, undefined 或空字符串，返回 undefined（表示未提供参数）
			if (val === null || val === undefined || val === '') return undefined;
			// 如果值为 'true'，返回 true
			if (val === 'true') return true;
			// 如果值为 'false'，返回 false
			if (val === 'false') return false;
			// 其他情况返回 undefined
			return undefined;
		},
		z.boolean().optional()
	), // 是否有电子书文件（只有明确传入 'true' 或 'false' 字符串时才解析）
});

export async function GET(req: NextRequest) {
	try {
		const searchParams = req.nextUrl.searchParams;
		const rawParams = {
			page: searchParams.get('page'),
			limit: searchParams.get('limit'),
			sort: searchParams.get('sort'),
			search: searchParams.get('search'), // searchParams.get会自动解码URL编码
			category: searchParams.get('category'),
			tag: searchParams.get('tag'),
			language: searchParams.get('language'),
			author: searchParams.get('author'),
			hasAssets: searchParams.get('hasAssets'),
		};
		console.log('[Books List API] 原始查询参数:', JSON.stringify(rawParams, null, 2));
		console.log('[Books List API] search原始值:', rawParams.search, '类型:', typeof rawParams.search);
		log.info('原始查询参数', { rawParams });
		log.info('search原始值', { search: rawParams.search, type: typeof rawParams.search });
		const params = querySchema.parse(rawParams);
		console.log('[Books List API] 解析后的参数:', JSON.stringify(params, null, 2));
		console.log('[Books List API] params.search值:', params.search, '类型:', typeof params.search, 'trim后:', params.search?.trim());
		log.info('解析后的参数', { params });
		log.info('params.search值', { search: params.search, type: typeof params.search, trimmed: params.search?.trim() });

		const skip = (params.page - 1) * params.limit;

		// 构建查询条件
		const whereConditions: any[] = [];

		// 搜索条件（标题、作者、简介）
		if (params.search && params.search.trim()) {
			const searchTerm = params.search.trim();
			console.log(`[Books List API] 搜索关键词: "${searchTerm}" (长度: ${searchTerm.length})`);
			log.info(`搜索关键词: "${searchTerm}" (长度: ${searchTerm.length}, 编码: ${Buffer.from(searchTerm, 'utf8').toString('hex')})`);
			
			const searchCondition = {
				OR: [
					{ title: { contains: searchTerm, mode: 'insensitive' } },
					{ author: { contains: searchTerm, mode: 'insensitive' } },
					{ overview: { contains: searchTerm, mode: 'insensitive' } },
				],
			};
			console.log('[Books List API] 搜索条件对象:', JSON.stringify(searchCondition, null, 2));
			log.info('搜索条件对象', { searchCondition });
			whereConditions.push(searchCondition);
		} else {
			console.log('[Books List API] 没有搜索条件或搜索条件为空');
			log.info('没有搜索条件或搜索条件为空');
		}

		// 分类筛选
		if (params.category) {
			whereConditions.push({ category: params.category });
		}

		// 标签筛选
		if (params.tag) {
			whereConditions.push({ tags: { has: params.tag } });
		}

		// 语言筛选
		if (params.language) {
			whereConditions.push({ language: params.language });
		}

		// 作者筛选
		if (params.author) {
			whereConditions.push({ author: { contains: params.author, mode: 'insensitive' } });
		}

		// 是否有电子书文件（只有在明确指定时才添加条件）
		// 注意：如果hasAssets是false，说明用户想找"无电子书"的，也需要添加条件
		// 但如果hasAssets是undefined，说明用户没有选择这个筛选，不应该添加条件
		if (params.hasAssets !== undefined && params.hasAssets !== null) {
			if (params.hasAssets === true) {
				whereConditions.push({ assets: { some: {} } }); // 至少有一个asset
			} else if (params.hasAssets === false) {
				whereConditions.push({ assets: { none: {} } }); // 没有asset
			}
		}

		const where = whereConditions.length > 0 ? { AND: whereConditions } : {};
		
		// 调试：打印查询条件
		console.log('[Books List API] 构建的查询条件:', JSON.stringify(where, null, 2));
		console.log('[Books List API] whereConditions数量:', whereConditions.length);
		log.info('构建的查询条件', { where });
		log.info('whereConditions数量', { count: whereConditions.length });

		// 获取总数
		const total = await prisma.book.count({ where });
		console.log(`[Books List API] 找到 ${total} 本书`);
		log.info(`找到 ${total} 本书`);

		// 构建排序
		let orderBy: any;
		if (params.sort === 'title') {
			orderBy = { title: 'asc' };
		} else if (params.sort === 'author') {
			orderBy = { author: 'asc' };
		} else {
			// latest (默认)
			orderBy = { createdAt: 'desc' };
		}

		// 查询书籍
		log.info('查询条件', { where });
		log.info('排序', { orderBy });
		log.info('分页', { skip, take: params.limit });
		
		const books = await prisma.book.findMany({
			where,
			orderBy,
			skip,
			take: params.limit,
			include: {
				assets: {
					select: {
						id: true,
						bookId: true,
						fileKey: true,
						mime: true,
						createdAt: true,
					},
					orderBy: { createdAt: 'asc' },
				},
			},
		});
		
		console.log(`[Books List API] 查询结果: ${books.length} 本书`);
		log.info(`查询结果: ${books.length} 本书`);
		if (books.length > 0) {
			console.log('[Books List API] 书籍列表:', books.map(b => ({ id: b.id, title: b.title, author: b.author })));
			log.info('书籍列表', { books: books.map(b => ({ id: b.id, title: b.title, author: b.author })) });
		} else {
			console.log('[Books List API] 未找到匹配的书籍');
			log.warn('未找到匹配的书籍');
			// 如果没有找到，尝试查询所有书籍看看数据库是否有数据
			const allBooksCount = await prisma.book.count();
			console.log(`[Books List API] 数据库中总共有 ${allBooksCount} 本书`);
			log.info(`数据库中总共有 ${allBooksCount} 本书`);
			if (allBooksCount > 0) {
				const sampleBooks = await prisma.book.findMany({ take: 3, select: { id: true, title: true, author: true } });
				console.log('[Books List API] 示例书籍:', sampleBooks);
				log.info('示例书籍', { sampleBooks });
			}
		}

		// 提取上传者信息
		const userIds = new Set<string>();
		books.forEach(book => {
			book.assets.forEach(asset => {
				const match = asset.fileKey.match(/^books\/([^\/]+)\//);
				if (match && match[1]) {
					userIds.add(match[1]);
				}
			});
		});

		// 查询用户信息
		const users = await prisma.user.findMany({
			where: { id: { in: Array.from(userIds) } },
			select: { id: true, name: true },
		});

		const userMap = new Map(users.map(u => [u.id, u.name || '匿名用户']));

		// 处理书籍数据，添加上传者信息
		const booksWithUploader = books.map(book => {
			const firstAsset = book.assets[0];
			let uploaderName: string | null = null;
			if (firstAsset) {
				const match = firstAsset.fileKey.match(/^books\/([^\/]+)\//);
				if (match && match[1]) {
					uploaderName = userMap.get(match[1]) || null;
				}
			}
			return {
				...book,
				assets: book.assets.map(a => ({
					id: a.id,
					fileKey: a.fileKey,
					mime: a.mime,
				})),
				uploaderName,
				createdAt: book.createdAt.toISOString(),
			};
		});

		// 获取所有分类和标签用于筛选选项（使用try-catch处理字段可能不存在的情况）
		let categories: Array<{ category: string | null }> = [];
		let allBooksForTags: Array<{ tags: string[] }> = [];
		
		try {
			[categories, allBooksForTags] = await Promise.all([
				prisma.book.findMany({
					where: { category: { not: null } },
					select: { category: true },
				}).catch(() => []),
				prisma.book.findMany({
					select: { tags: true },
				}).catch(() => []),
			]);
		} catch (err) {
			// 如果字段不存在，使用空数组
			log.warn('获取分类和标签失败，可能字段尚未迁移', { error: err });
		}

		const uniqueCategories = Array.from(new Set(
			categories
				.map(b => b.category)
				.filter((c): c is string => c !== null)
		));

		const allTags = new Set<string>();
		allBooksForTags.forEach(book => {
			book.tags.forEach(tag => allTags.add(tag));
		});

		const uniqueTags = Array.from(allTags);

		return NextResponse.json({
			books: booksWithUploader,
			pagination: {
				page: params.page,
				limit: params.limit,
				total,
				totalPages: Math.ceil(total / params.limit),
				hasNext: skip + params.limit < total,
				hasPrev: params.page > 1,
			},
			filters: {
				categories: uniqueCategories,
				tags: uniqueTags,
			},
		});
	} catch (error: any) {
		log.error('获取书籍列表失败', error as Error);
		console.error('[Books List API] 详细错误:', error);
		console.error('[Books List API] 错误堆栈:', error.stack);
		return NextResponse.json(
			{ 
				error: error.message || '获取书籍列表失败',
				details: process.env.NODE_ENV === 'development' ? error.stack : undefined
			},
			{ status: 500 }
		);
	}
}

