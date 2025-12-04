'use client';
import { useState } from 'react';

type Book = {
	id: string;
	title: string;
	author: string | null;
	coverUrl: string | null;
	overview: string | null;
};

type ShelfItem = {
	id: string;
	bookId: string;
	book: Book;
	createdAt: Date;
};

export default function ShelfBookList({ items }: { items: ShelfItem[] }) {
	const [removing, setRemoving] = useState<string | null>(null);
	const [msg, setMsg] = useState<string | null>(null);
	const [localItems, setLocalItems] = useState(items);

	const onRemove = async (bookId: string) => {
		setRemoving(bookId);
		setMsg(null);
		try {
			const res = await fetch(`/api/books/${bookId}/shelf`, { method: 'DELETE' });
			const data = await res.json();
			if (res.ok) {
				setMsg('已从书架移除');
				setLocalItems(localItems.filter((it) => it.bookId !== bookId));
			} else {
				setMsg(data.error || '移除失败');
			}
		} catch (err: any) {
			setMsg(err.message || '移除出错');
		} finally {
			setRemoving(null);
		}
	};

	if (localItems.length === 0) {
		return (
			<div className="card-academic" style={{ 
				padding: 'var(--spacing-xxl)', 
				textAlign: 'center',
				background: 'var(--color-background-paper)',
				borderRadius: 'var(--radius-lg)',
				boxShadow: 'var(--shadow-sm)',
				border: '1px solid var(--color-border-light)'
			}}>
				<div style={{
					fontSize: '64px',
					marginBottom: 'var(--spacing-md)',
					opacity: 0.5
				}}>📚</div>
				<p style={{ 
					color: 'var(--color-text-secondary)',
					fontSize: 'var(--font-size-base)',
					margin: 0,
					fontWeight: 500,
					marginBottom: 'var(--spacing-md)'
				}}>
					你的书架还是空的
				</p>
				<a 
					href="/library" 
					className="btn-academic-primary"
					style={{
						display: 'inline-block',
						padding: 'var(--spacing-md) var(--spacing-xl)',
						fontSize: 'var(--font-size-base)',
						fontWeight: 600,
						textDecoration: 'none',
						borderRadius: 'var(--radius-md)',
						transition: 'all var(--transition-fast)'
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.transform = 'translateY(-2px)';
						e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = 'translateY(0)';
						e.currentTarget.style.boxShadow = 'none';
					}}
				>
					<span>📖</span> 去公共图书馆添加书籍
				</a>
			</div>
		);
	}

	return (
		<div>
			{msg && (
				<div
					style={{
						padding: 'var(--spacing-md) var(--spacing-lg)',
						background: msg.includes('已移除') 
							? 'linear-gradient(135deg, rgba(184, 134, 11, 0.1) 0%, rgba(184, 134, 11, 0.05) 100%)' 
							: 'linear-gradient(135deg, rgba(198, 40, 40, 0.1) 0%, rgba(198, 40, 40, 0.05) 100%)',
						color: msg.includes('已移除') 
							? 'var(--color-warning)' 
							: 'var(--color-error)',
						borderLeft: `4px solid ${msg.includes('已移除') ? 'var(--color-warning)' : 'var(--color-error)'}`,
						borderRadius: 'var(--radius-md)',
						marginBottom: 'var(--spacing-xl)',
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500,
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-sm)',
						boxShadow: 'var(--shadow-sm)'
					}}
				>
					<span>{msg.includes('已移除') ? '⚠️' : '❌'}</span>
					{msg}
				</div>
			)}
			<div style={{ 
				display: 'grid', 
				gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
				gap: 'var(--spacing-lg)'
			}}>
				{localItems.map((item) => {
					const book = item.book;
					return (
						<div
							key={item.id}
							className="card-academic"
							style={{
								padding: 'var(--spacing-md)',
								background: 'var(--color-background-paper)',
								borderRadius: 'var(--radius-md)',
								border: '1px solid var(--color-border-light)',
								boxShadow: 'var(--shadow-sm)',
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--spacing-sm)',
								transition: 'all var(--transition-normal)',
								cursor: 'pointer',
								position: 'relative',
								overflow: 'hidden'
							}}
							onClick={() => window.location.href = `/books/${book.id}`}
							onMouseEnter={(e) => {
								e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
								e.currentTarget.style.transform = 'translateY(-4px)';
								e.currentTarget.style.borderColor = 'var(--color-accent-warm)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
								e.currentTarget.style.transform = 'translateY(0)';
								e.currentTarget.style.borderColor = 'var(--color-border-light)';
							}}
						>
							{book.coverUrl ? (
								<img
									src={book.coverUrl}
									alt={book.title}
									style={{ 
										width: '100%', 
										height: 'auto', 
										borderRadius: 'var(--radius-md)', 
										objectFit: 'cover', 
										aspectRatio: '3/4',
										boxShadow: 'var(--shadow-sm)'
									}}
									onClick={(e) => {
										e.stopPropagation();
										window.location.href = `/books/${book.id}`;
									}}
								/>
							) : (
								<div
									style={{
										width: '100%',
										aspectRatio: '3/4',
										background: 'var(--color-background-subtle)',
										borderRadius: 'var(--radius-md)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										color: 'var(--color-text-tertiary)',
										fontSize: 'var(--font-size-sm)',
										border: '1px solid var(--color-border-light)'
									}}
								>
									无封面
								</div>
							)}
							<div style={{ flex: 1, paddingTop: 'var(--spacing-xs)' }}>
								<h4 style={{ 
									margin: '0 0 var(--spacing-xs) 0', 
									fontSize: 'var(--font-size-base)', 
									lineHeight: 'var(--line-height-tight)', 
									fontWeight: 600
								}}>
									<a 
										href={`/books/${book.id}`} 
										style={{ 
											textDecoration: 'none', 
											color: 'var(--color-text-primary)',
											transition: 'color var(--transition-fast)'
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.color = 'var(--color-primary)';
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.color = 'var(--color-text-primary)';
										}}
									>
										{book.title}
									</a>
								</h4>
								{book.author && (
									<p style={{ 
										margin: 0, 
										fontSize: 'var(--font-size-sm)', 
										color: 'var(--color-text-secondary)'
									}}>
										{book.author}
									</p>
								)}
								<p style={{ 
									margin: 'var(--spacing-xs) 0 0 0', 
									fontSize: 'var(--font-size-xs)', 
									color: 'var(--color-text-tertiary)',
									fontStyle: 'italic'
								}}>
									收藏于：{new Date(item.createdAt).toLocaleDateString('zh-CN')}
								</p>
							</div>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									if (confirm('确定要从书架移除这本书吗？')) {
										onRemove(book.id);
									}
								}}
								disabled={removing === book.id}
								className="btn-academic"
								style={{
									padding: 'var(--spacing-xs) var(--spacing-md)',
									fontSize: 'var(--font-size-sm)',
									fontWeight: 500,
									background: 'var(--color-error)',
									borderColor: 'var(--color-error)',
									borderRadius: 'var(--radius-md)',
									color: '#fff',
									opacity: removing === book.id ? 0.6 : 1,
									cursor: removing === book.id ? 'not-allowed' : 'pointer',
									transition: 'all var(--transition-fast)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: 'var(--spacing-xs)'
								}}
								onMouseEnter={(e) => {
									if (removing !== book.id) {
										e.currentTarget.style.transform = 'translateY(-1px)';
										e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
										e.currentTarget.style.background = 'var(--color-error-dark)';
									}
								}}
								onMouseLeave={(e) => {
									if (removing !== book.id) {
										e.currentTarget.style.transform = 'translateY(0)';
										e.currentTarget.style.boxShadow = 'none';
										e.currentTarget.style.background = 'var(--color-error)';
									}
								}}
							>
								{removing === book.id ? (
									<>
										<span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
										移除中...
									</>
								) : (
									<>
										<span>🗑️</span>
										从书架移除
									</>
								)}
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}

