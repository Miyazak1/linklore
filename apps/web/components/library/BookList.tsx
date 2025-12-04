'use client';
import { useState, useEffect } from 'react';

type Book = {
	id: string;
	title: string;
	author: string | null;
	coverUrl: string | null;
	overview: string | null;
	createdAt: Date;
	assets?: Array<{ id: string; fileKey: string; mime: string }>;
};

export default function BookList({ initialBooks }: { initialBooks: Book[] }) {
	const [books, setBooks] = useState(initialBooks);
	const [shelfBookIds, setShelfBookIds] = useState<Set<string>>(new Set());
	const [adding, setAdding] = useState<string | null>(null);
	const [msg, setMsg] = useState<string | null>(null);

	useEffect(() => {
		// Fetch user's shelf to check which books are already added
		fetch('/api/books/my-shelf')
			.then((res) => res.json())
			.then((data) => {
				if (data.items) {
					setShelfBookIds(new Set(data.items.map((it: any) => it.bookId)));
				}
			})
			.catch(() => {
				// Ignore errors
			});
	}, []);

	const onAddToShelf = async (bookId: string) => {
		setAdding(bookId);
		setMsg(null);
		try {
			const res = await fetch(`/api/books/${bookId}/shelf`, { method: 'POST' });
			const data = await res.json();
			if (res.ok) {
				setMsg('已添加到我的书架');
				setShelfBookIds(new Set([...shelfBookIds, bookId]));
			} else {
				setMsg(data.error || '添加失败');
			}
		} catch (err: any) {
			setMsg(err.message || '添加出错');
		} finally {
			setAdding(null);
		}
	};

	const onRemoveFromShelf = async (bookId: string) => {
		setAdding(bookId);
		setMsg(null);
		try {
			const res = await fetch(`/api/books/${bookId}/shelf`, { method: 'DELETE' });
			const data = await res.json();
			if (res.ok) {
				setMsg('已从书架移除');
				const newSet = new Set(shelfBookIds);
				newSet.delete(bookId);
				setShelfBookIds(newSet);
			} else {
				setMsg(data.error || '移除失败');
			}
		} catch (err: any) {
			setMsg(err.message || '移除出错');
		} finally {
			setAdding(null);
		}
	};

	if (books.length === 0) {
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
					fontWeight: 500
				}}>
					图书馆暂无书籍，使用上方搜索框添加第一本书吧！
				</p>
			</div>
		);
	}

	return (
		<div>
			{msg && (
				<div
					style={{
						padding: 'var(--spacing-md) var(--spacing-lg)',
						background: msg.includes('已添加') 
							? 'linear-gradient(135deg, rgba(45, 122, 50, 0.1) 0%, rgba(45, 122, 50, 0.05) 100%)' 
							: msg.includes('已移除') 
							? 'linear-gradient(135deg, rgba(184, 134, 11, 0.1) 0%, rgba(184, 134, 11, 0.05) 100%)' 
							: 'linear-gradient(135deg, rgba(198, 40, 40, 0.1) 0%, rgba(198, 40, 40, 0.05) 100%)',
						color: msg.includes('已添加') 
							? 'var(--color-success)' 
							: msg.includes('已移除') 
							? 'var(--color-warning)' 
							: 'var(--color-error)',
						borderLeft: `4px solid ${
							msg.includes('已添加') 
								? 'var(--color-success)' 
								: msg.includes('已移除') 
								? 'var(--color-warning)' 
								: 'var(--color-error)'
						}`,
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
					<span>
						{msg.includes('已添加') ? '✅' : msg.includes('已移除') ? '⚠️' : '❌'}
					</span>
					{msg}
				</div>
			)}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				gap: 'var(--spacing-md)',
				marginBottom: 'var(--spacing-xl)',
				paddingBottom: 'var(--spacing-lg)',
				borderBottom: '2px solid var(--color-border-light)'
			}}>
				<div style={{
					width: '40px',
					height: '40px',
					borderRadius: 'var(--radius-md)',
					background: 'var(--color-secondary-lighter)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: '20px',
					flexShrink: 0
				}}>
					📖
				</div>
				<h2 style={{ 
					margin: 0,
					fontSize: 'var(--font-size-2xl)',
					fontWeight: 600,
					color: 'var(--color-text-primary)'
				}}>
					图书馆书籍 <span style={{ 
						color: 'var(--color-text-secondary)',
						fontSize: 'var(--font-size-lg)',
						fontWeight: 400
					}}>({books.length})</span>
				</h2>
			</div>
			<div style={{ 
				display: 'grid', 
				gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
				gap: 'var(--spacing-lg)'
			}}>
				{books.map((book) => {
					const inShelf = shelfBookIds.has(book.id);
					return (
						<div
							key={book.id}
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
								e.currentTarget.style.borderColor = 'var(--color-primary)';
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
								{book.assets && book.assets.length > 0 && (
									<p style={{ 
										margin: 'var(--spacing-xs) 0 0 0', 
										fontSize: 'var(--font-size-xs)', 
										color: 'var(--color-success)',
										fontWeight: 500
									}}>
										✓ 有电子书 ({book.assets.length})
									</p>
								)}
							</div>
							{inShelf ? (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onRemoveFromShelf(book.id);
									}}
									disabled={adding === book.id}
									className="btn-academic"
									style={{
										padding: 'var(--spacing-xs) var(--spacing-md)',
										fontSize: 'var(--font-size-sm)',
										fontWeight: 500,
										background: 'var(--color-warning)',
										borderColor: 'var(--color-warning)',
										borderRadius: 'var(--radius-md)',
										color: '#fff',
										opacity: adding === book.id ? 0.6 : 1,
										cursor: adding === book.id ? 'not-allowed' : 'pointer',
										transition: 'all var(--transition-fast)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										gap: 'var(--spacing-xs)'
									}}
									onMouseEnter={(e) => {
										if (adding !== book.id) {
											e.currentTarget.style.transform = 'translateY(-1px)';
											e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
										}
									}}
									onMouseLeave={(e) => {
										if (adding !== book.id) {
											e.currentTarget.style.transform = 'translateY(0)';
											e.currentTarget.style.boxShadow = 'none';
										}
									}}
								>
									{adding === book.id ? (
										<>
											<span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
											处理中...
										</>
									) : (
										<>
											<span>📤</span>
											从书架移除
										</>
									)}
								</button>
							) : (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onAddToShelf(book.id);
									}}
									disabled={adding === book.id}
									className="btn-academic-primary"
									style={{
										padding: 'var(--spacing-xs) var(--spacing-md)',
										fontSize: 'var(--font-size-sm)',
										fontWeight: 500,
										background: 'var(--color-success)',
										borderColor: 'var(--color-success)',
										borderRadius: 'var(--radius-md)',
										opacity: adding === book.id ? 0.6 : 1,
										cursor: adding === book.id ? 'not-allowed' : 'pointer',
										transition: 'all var(--transition-fast)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										gap: 'var(--spacing-xs)'
									}}
									onMouseEnter={(e) => {
										if (adding !== book.id) {
											e.currentTarget.style.transform = 'translateY(-1px)';
											e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
										}
									}}
									onMouseLeave={(e) => {
										if (adding !== book.id) {
											e.currentTarget.style.transform = 'translateY(0)';
											e.currentTarget.style.boxShadow = 'none';
										}
									}}
								>
									{adding === book.id ? (
										<>
											<span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
											处理中...
										</>
									) : (
										<>
											<span>➕</span>
											添加到书架
										</>
									)}
								</button>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

