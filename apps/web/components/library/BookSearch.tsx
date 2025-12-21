'use client';
import { useState } from 'react';
import { SearchIcon, PlusIcon } from '@/components/ui/Icons';

export default function BookSearch() {
	const [query, setQuery] = useState('');
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<any[]>([]);
	const [msg, setMsg] = useState<string | null>(null);

	const onSearch = async () => {
		if (!query.trim()) return;
		setSearching(true);
		setMsg(null);
		try {
			const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
			const data = await res.json();
			if (res.ok) {
				setResults(data.items || []);
				if (data.items?.length === 0) {
					setMsg('未找到相关书籍');
				}
			} else {
				setMsg(data.error || '搜索失败');
			}
		} catch (err: any) {
			setMsg(err.message || '搜索出错');
		} finally {
			setSearching(false);
		}
	};

	const onAddToLibrary = async (book: any) => {
		setMsg(null);
		try {
			const res = await fetch('/api/books/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: book.title,
					author: book.author,
					coverUrl: book.coverUrl,
					source: 'openlibrary'
				})
			});
			const data = await res.json();
			if (res.ok) {
				setMsg(`已添加《${book.title}》到图书馆`);
				// Remove from results
				setResults(results.filter((r) => r.title !== book.title || r.author !== book.author));
				// Refresh page after a short delay
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			} else {
				setMsg(data.error || '添加失败');
			}
		} catch (err: any) {
			setMsg(err.message || '添加出错');
		}
	};

	const [isFocused, setIsFocused] = useState(false);

	return (
		<div className="card-academic" style={{ 
			marginBottom: 'var(--spacing-xxl)',
			padding: 'var(--spacing-xxl)',
			background: 'var(--color-background-paper)',
			borderRadius: 'var(--radius-lg)',
			boxShadow: 'var(--shadow-md)',
			border: '1px solid var(--color-border-light)',
			transition: 'all var(--transition-normal)'
		}}>
			<div style={{
				display: 'flex',
				alignItems: 'center',
				gap: 'var(--spacing-md)',
				marginBottom: 'var(--spacing-lg)'
			}}>
				<div style={{
					width: '48px',
					height: '48px',
					borderRadius: 'var(--radius-md)',
					background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0
				}}>
					<SearchIcon size={24} color="white" />
				</div>
				<div>
					<h3 style={{ 
						marginTop: 0,
						marginBottom: 'var(--spacing-xs)',
						fontSize: 'var(--font-size-2xl)',
						fontWeight: 600,
						color: 'var(--color-text-primary)'
					}}>
						搜索书籍
					</h3>
					<p style={{ 
						fontSize: 'var(--font-size-sm)', 
						color: 'var(--color-text-secondary)', 
						margin: 0,
						lineHeight: 'var(--line-height-relaxed)'
					}}>
						从 Open Library 搜索并添加书籍到图书馆
					</p>
				</div>
			</div>
			<div style={{ 
				display: 'flex', 
				gap: 'var(--spacing-sm)',
				background: 'var(--color-background-paper)',
				borderRadius: 'var(--radius-lg)',
				padding: 'var(--spacing-xs)',
				boxShadow: isFocused ? '0 0 0 4px var(--color-primary-lighter), var(--shadow-lg)' : 'var(--shadow-md)',
				border: `1px solid ${isFocused ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
				transition: 'all var(--transition-fast)',
				marginBottom: 'var(--spacing-md)'
			}}>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-sm)',
					flex: 1,
					padding: '0 var(--spacing-md)'
				}}>
					<SearchIcon size={20} color="var(--color-text-secondary)" style={{ opacity: 0.6 }} />
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && onSearch()}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
						placeholder="搜索书名、作者..."
						style={{ 
							flex: 1, 
							padding: 'var(--spacing-md) 0', 
							fontSize: 'var(--font-size-base)', 
							border: 'none',
							outline: 'none',
							background: 'transparent',
							color: 'var(--color-text-primary)',
							fontFamily: 'var(--font-family)'
						}}
						disabled={searching}
					/>
				</div>
				<button
					type="button"
					onClick={onSearch}
					disabled={searching || !query.trim()}
					className="btn-academic-primary"
					style={{
						padding: 'var(--spacing-md) var(--spacing-xl)',
						fontSize: 'var(--font-size-base)',
						fontWeight: 600,
						borderRadius: 'var(--radius-md)',
						opacity: (searching || !query.trim()) ? 0.6 : 1,
						cursor: (searching || !query.trim()) ? 'not-allowed' : 'pointer',
						transition: 'all var(--transition-fast)',
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-xs)',
						whiteSpace: 'nowrap'
					}}
					onMouseEnter={(e) => {
						if (!(searching || !query.trim())) {
							e.currentTarget.style.transform = 'translateY(-1px)';
							e.currentTarget.style.boxShadow = 'var(--shadow-md)';
						}
					}}
					onMouseLeave={(e) => {
						if (!(searching || !query.trim())) {
							e.currentTarget.style.transform = 'translateY(0)';
							e.currentTarget.style.boxShadow = 'none';
						}
					}}
				>
					{searching ? (
						<>
							<span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
							搜索中...
						</>
					) : (
						<>
							<SearchIcon size={16} color="currentColor" />
							搜索
						</>
					)}
				</button>
			</div>
			{msg && (
				<div
					style={{
						padding: 'var(--spacing-md) var(--spacing-lg)',
						background: msg.includes('已添加') 
							? 'linear-gradient(135deg, rgba(45, 122, 50, 0.1) 0%, rgba(45, 122, 50, 0.05) 100%)' 
							: msg.includes('失败') || msg.includes('出错') 
							? 'linear-gradient(135deg, rgba(198, 40, 40, 0.1) 0%, rgba(198, 40, 40, 0.05) 100%)' 
							: 'linear-gradient(135deg, rgba(184, 134, 11, 0.1) 0%, rgba(184, 134, 11, 0.05) 100%)',
						color: msg.includes('已添加') 
							? 'var(--color-success)' 
							: msg.includes('失败') || msg.includes('出错') 
							? 'var(--color-error)' 
							: 'var(--color-warning)',
						borderLeft: `4px solid ${
							msg.includes('已添加') 
								? 'var(--color-success)' 
								: msg.includes('失败') || msg.includes('出错') 
								? 'var(--color-error)' 
								: 'var(--color-warning)'
						}`,
						borderRadius: 'var(--radius-md)',
						marginBottom: 'var(--spacing-md)',
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500,
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-sm)',
						boxShadow: 'var(--shadow-sm)'
					}}
				>
					<span>
						{msg.includes('已添加') ? '✅' : msg.includes('失败') || msg.includes('出错') ? '❌' : '⚠️'}
					</span>
					{msg}
				</div>
			)}
			{results.length > 0 && (
				<div style={{ 
					display: 'grid', 
					gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
					gap: 'var(--spacing-lg)',
					marginTop: 'var(--spacing-lg)'
				}}>
					{results.map((book, idx) => (
						<div
							key={idx}
							className="card-academic"
							style={{
								padding: 'var(--spacing-md)',
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--spacing-sm)',
								border: '1px solid var(--color-border-light)',
								borderRadius: 'var(--radius-md)',
								background: 'var(--color-background-paper)',
								boxShadow: 'var(--shadow-sm)',
								transition: 'all var(--transition-fast)',
								cursor: 'pointer'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.boxShadow = 'var(--shadow-md)';
								e.currentTarget.style.transform = 'translateY(-2px)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
								e.currentTarget.style.transform = 'translateY(0)';
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
									fontWeight: 600,
									color: 'var(--color-text-primary)'
								}}>
									{book.title}
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
							</div>
							<button
								type="button"
								onClick={() => onAddToLibrary(book)}
								className="btn-academic-primary"
								style={{
									padding: 'var(--spacing-xs) var(--spacing-md)',
									fontSize: 'var(--font-size-sm)',
									fontWeight: 500,
									background: 'var(--color-success)',
									borderColor: 'var(--color-success)',
									borderRadius: 'var(--radius-md)',
									transition: 'all var(--transition-fast)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: 'var(--spacing-xs)'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.transform = 'translateY(-1px)';
									e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.transform = 'translateY(0)';
									e.currentTarget.style.boxShadow = 'none';
								}}
							>
								<PlusIcon size={16} color="currentColor" />
								添加到图书馆
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

