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
		orderBy: { createdAt: 'desc' }
	});

	// Convert Date to ISO string for client component
	const bookForClient = {
		...book,
		createdAt: book.createdAt.toISOString(),
		assets: assets.map(asset => ({
			...asset,
			createdAt: asset.createdAt.toISOString()
		}))
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

