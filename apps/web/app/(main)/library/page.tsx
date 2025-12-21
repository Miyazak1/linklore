import { prisma } from '@/lib/db/client';
import BookSearch from '@/components/library/BookSearch';
import LibraryBookList from '@/components/library/LibraryBookList';
import BookUpload from '@/components/library/BookUpload';
import LibraryBanner from '@/components/library/LibraryBanner';

export default async function LibraryPage() {
	// Get books and their assets separately to avoid Prisma Client cache issues
	const books = await prisma.book.findMany({
		orderBy: { createdAt: 'desc' },
		take: 50
	});
	
	// Get assets for these books
	const bookIds = books.map(b => b.id);
	const assets = await prisma.bookAsset.findMany({
		where: { bookId: { in: bookIds } },
		select: { id: true, bookId: true, fileKey: true, mime: true, createdAt: true },
		orderBy: { createdAt: 'asc' } // 按创建时间排序，以便获取第一个上传者
	});
	
	// Extract userIds from fileKeys (format: books/{userId}/{timestamp}-{filename})
	const userIds = new Set<string>();
	assets.forEach(asset => {
		const match = asset.fileKey.match(/^books\/([^\/]+)\//);
		if (match && match[1]) {
			userIds.add(match[1]);
		}
	});
	
	// Query users to get names
	const users = await prisma.user.findMany({
		where: { id: { in: Array.from(userIds) } },
		select: { id: true, name: true }
	});
	
	const userMap = new Map(users.map(u => [u.id, u.name || '匿名用户']));
	
	// Map assets to books and find uploader (first uploader)
	const booksWithAssets = books.map(book => {
		const bookAssets = assets.filter(a => a.bookId === book.id);
		// Get the first asset (earliest uploader)
		const firstAsset = bookAssets[0];
		let uploaderName: string | null = null;
		if (firstAsset) {
			const match = firstAsset.fileKey.match(/^books\/([^\/]+)\//);
			if (match && match[1]) {
				uploaderName = userMap.get(match[1]) || null;
			}
		}
		return {
			...book,
			assets: bookAssets.map(a => ({ id: a.id, fileKey: a.fileKey, mime: a.mime })),
			uploaderName,
			createdAt: book.createdAt.toISOString(),
		};
	});

	// 获取所有分类和标签用于筛选选项
	const [categoriesResult, allBooksForTags] = await Promise.all([
		prisma.book.findMany({
			where: { category: { not: null } },
			select: { category: true },
			distinct: ['category'],
		}).catch(() => []),
		prisma.book.findMany({
			select: { tags: true },
		}).catch(() => []),
	]);

	const uniqueCategories = categoriesResult
		.map(b => b.category)
		.filter((c): c is string => c !== null);

	const allTags = new Set<string>();
	allBooksForTags.forEach(book => {
		book.tags.forEach(tag => allTags.add(tag));
	});
	const uniqueTags = Array.from(allTags);

	return (
		<main style={{ 
			padding: 'var(--spacing-xl)', 
			maxWidth: 1400, 
			margin: '0 auto',
			background: 'var(--color-background)',
			minHeight: 'calc(100vh - 200px)'
		}}>
			{/* 页面标题 - Banner区域 */}
			<LibraryBanner 
				title="公共图书馆"
				description="搜索并添加书籍到公共图书馆，或上传电子书文件。所有用户都可以看到。"
			/>

			{/* 上传电子书 */}
			<BookUpload />

			{/* 搜索书籍 */}
			<BookSearch />

			{/* 书籍列表（带筛选） */}
			<div style={{ marginTop: 'var(--spacing-xxl)' }}>
				<LibraryBookList 
					initialBooks={booksWithAssets}
					initialCategories={uniqueCategories}
					initialTags={uniqueTags}
				/>
			</div>
		</main>
	);
}


