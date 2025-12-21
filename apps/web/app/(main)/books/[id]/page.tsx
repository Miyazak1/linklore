import { prisma } from '@/lib/db/client';
import { redirect } from 'next/navigation';
import BookDetail from '@/components/library/BookDetail';

type Props = { params: Promise<{ id: string }> };

export default async function BookDetailPage({ params }: Props) {
	const { id } = await params;
	const book = await prisma.book.findUnique({
		where: { id }
	});

	if (!book) {
		redirect('/library');
	}

	// Fetch assets separately to avoid Prisma Client cache issues
	const assets = await prisma.bookAsset.findMany({
		where: { bookId: id },
		orderBy: { createdAt: 'asc' } // 按创建时间升序排序，以便获取第一个上传者
	});

	// Extract userId from first asset's fileKey (format: books/{userId}/{timestamp}-{filename})
	let uploaderName: string | null = null;
	if (assets.length > 0) {
		const firstAsset = assets[0];
		const match = firstAsset.fileKey.match(/^books\/([^\/]+)\//);
		if (match && match[1]) {
			const userId = match[1];
			try {
				const user = await prisma.user.findUnique({
					where: { id: userId },
					select: { name: true }
				});
				uploaderName = user?.name || '匿名用户';
			} catch {
				uploaderName = '匿名用户';
			}
		}
	}

	// Convert Date to ISO string for client component
	const bookForClient = {
		...book,
		createdAt: book.createdAt.toISOString(),
		assets: assets.map(asset => ({
			...asset,
			createdAt: asset.createdAt.toISOString()
		})),
		uploaderName
	};

	return (
		<main style={{ 
			padding: 'var(--spacing-xl)', 
			maxWidth: 1400, 
			margin: '0 auto',
			background: 'var(--color-background)'
		}}>
			<BookDetail book={bookForClient} />
		</main>
	);
}

