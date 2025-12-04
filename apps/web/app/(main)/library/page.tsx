import { prisma } from '@/lib/db/client';
import BookSearch from '@/components/library/BookSearch';
import BookList from '@/components/library/BookList';
import BookUpload from '@/components/library/BookUpload';

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
		select: { id: true, bookId: true, fileKey: true, mime: true }
	});
	
	// Map assets to books
	const booksWithAssets = books.map(book => ({
		...book,
		assets: assets.filter(a => a.bookId === book.id)
	}));
	return (
		<main style={{ 
			padding: 'var(--spacing-xl)', 
			maxWidth: 1400, 
			margin: '0 auto',
			background: 'var(--color-background)',
			minHeight: 'calc(100vh - 200px)'
		}}>
			{/* Header */}
			<div style={{ 
				marginBottom: 'var(--spacing-xxl)',
				paddingBottom: 'var(--spacing-xl)',
				borderBottom: '2px solid var(--color-border-light)',
				textAlign: 'center'
			}}>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 'var(--spacing-md)',
					marginBottom: 'var(--spacing-md)'
				}}>
					<div style={{
						width: '64px',
						height: '64px',
						borderRadius: 'var(--radius-lg)',
						background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: '32px',
						boxShadow: 'var(--shadow-md)'
					}}>
						📚
					</div>
					<h1 style={{ 
						margin: 0,
						fontSize: 'clamp(2rem, 5vw, 3rem)',
						fontWeight: 700,
						background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
						backgroundClip: 'text',
						letterSpacing: '-0.02em'
					}}>
						公共图书馆
					</h1>
				</div>
				<p style={{ 
					color: 'var(--color-text-secondary)', 
					margin: 0,
					fontSize: 'var(--font-size-lg)',
					lineHeight: 'var(--line-height-relaxed)',
					maxWidth: '600px',
					marginLeft: 'auto',
					marginRight: 'auto'
				}}>
					搜索并添加书籍到公共图书馆，或上传电子书文件。所有用户都可以看到。
				</p>
			</div>
			
			<BookUpload />
			<BookSearch />
			<BookList initialBooks={booksWithAssets} />
		</main>
	);
}


