import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import ShelfBookList from '@/components/library/ShelfBookList';

export default async function MyShelfPage() {
	const session = await readSession();
	if (!session?.sub) {
		redirect('/signin');
	}

	const items = await prisma.bookshelfItem.findMany({
		where: { userId: String(session.sub) },
		include: { book: true },
		orderBy: { createdAt: 'desc' }
	});

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
						background: 'linear-gradient(135deg, var(--color-accent-warm) 0%, var(--color-primary) 100%)',
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
						background: 'linear-gradient(135deg, var(--color-accent-warm) 0%, var(--color-primary) 100%)',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
						backgroundClip: 'text',
						letterSpacing: '-0.02em'
					}}>
						我的书架
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
					你已收藏 <strong style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-xl)' }}>{items.length}</strong> 本书。
					访问 <a href="/library" className="academic-link" style={{ fontWeight: 500 }}>公共图书馆</a> 添加更多书籍。
				</p>
			</div>
			
			<ShelfBookList items={items} />
		</main>
	);
}


