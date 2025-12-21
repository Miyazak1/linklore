'use client';

import { useState, useEffect, useRef } from 'react';
import EpubReader from '@/components/reader/EpubReader';
import { createModuleLogger } from '@/lib/utils/logger';
import { MessageIcon, LibraryIcon, BookIcon } from '@/components/ui/Icons';

const log = createModuleLogger('BookSearchDialog');

interface Book {
	id?: string;
	title: string;
	author: string | null;
	coverUrl: string | null;
	overview?: string | null;
	source?: string | null;
	assets?: Array<{ id: string; fileKey: string; mime: string }>;
}

interface BookSearchDialogProps {
	open: boolean;
	onClose: () => void;
	onSelect?: (book: Book) => void; // 选择图书后的回调，可以插入到输入框
}

export default function BookSearchDialog({ open, onClose, onSelect }: BookSearchDialogProps) {
	const [query, setQuery] = useState('');
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<Book[]>([]);
	const [selectedBook, setSelectedBook] = useState<Book | null>(null);
	const [reading, setReading] = useState(false);
	const [selectedAsset, setSelectedAsset] = useState<{ id: string; fileKey: string; mime: string } | null>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// 当对话框打开时，聚焦搜索框
	useEffect(() => {
		if (open && searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, [open]);

	// 搜索图书
	const handleSearch = async () => {
		if (!query.trim()) return;
		
		setSearching(true);
		try {
			const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
			const data = await res.json();
			if (res.ok) {
				setResults(data.items || []);
			} else {
				log.error('搜索失败', new Error(data.error || 'Search failed'), { error: data.error });
				setResults([]);
			}
		} catch (err: any) {
			log.error('搜索出错', err as Error);
			setResults([]);
		} finally {
			setSearching(false);
		}
	};

	// 获取图书详情（如果图书已保存到数据库，或先保存再获取）
	const fetchBookDetail = async (book: Book) => {
		if (book.id) {
			// 如果已有ID，直接获取详情
			try {
				const res = await fetch(`/api/books/${book.id}`);
				if (res.ok) {
					const data = await res.json();
					return data.book;
				}
			} catch (err) {
				log.error('获取图书详情失败', err as Error);
			}
		} else {
			// 如果图书没有ID（来自搜索结果），先保存到数据库
			try {
				const res = await fetch('/api/books/add', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: book.title,
						author: book.author,
						coverUrl: book.coverUrl,
						source: book.source || 'openlibrary'
					})
				});
				if (res.ok) {
					const data = await res.json();
					// 保存成功后，获取完整详情
					if (data.book?.id) {
						const detailRes = await fetch(`/api/books/${data.book.id}`);
						if (detailRes.ok) {
							const detailData = await detailRes.json();
							return detailData.book;
						}
					}
					return data.book;
				}
			} catch (err) {
				log.error('保存图书失败', err as Error);
			}
		}
		return book;
	};

	// 选择图书
	const handleSelectBook = async (book: Book) => {
		// 先显示基本信息，然后异步获取详情
		setSelectedBook(book);
		// 异步获取完整详情（如果有ID或可以保存）
		const bookDetail = await fetchBookDetail(book);
		if (bookDetail && bookDetail.id) {
			setSelectedBook(bookDetail);
		}
	};

	// 返回搜索结果列表
	const handleBack = () => {
		setSelectedBook(null);
		setReading(false);
		setSelectedAsset(null);
	};

	// 开始阅读
	const handleRead = (asset: { id: string; fileKey: string; mime: string }) => {
		setSelectedAsset(asset);
		setReading(true);
	};

	// 选择图书并插入到输入框
	const handleInsertBook = () => {
		if (selectedBook && onSelect) {
			onSelect(selectedBook);
			onClose();
		}
	};

	if (!open) return null;

	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: 'rgba(0, 0, 0, 0.4)',
				backdropFilter: 'blur(4px)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1000,
				padding: '20px',
				animation: 'fadeIn 0.2s ease-out'
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<style>{`
				@keyframes fadeIn {
					from { opacity: 0; }
					to { opacity: 1; }
				}
				@keyframes slideUp {
					from { transform: translateY(20px); opacity: 0; }
					to { transform: translateY(0); opacity: 1; }
				}
			`}</style>
			<div
				style={{
					background: 'var(--color-background-paper)',
					borderRadius: '24px',
					width: '100%',
					maxWidth: '900px',
					maxHeight: '90vh',
					display: 'flex',
					flexDirection: 'column',
					boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
					overflow: 'hidden',
					animation: 'slideUp 0.3s ease-out'
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* 头部 */}
				<div
					style={{
						padding: '20px 24px',
						borderBottom: '1px solid var(--color-border-light)',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						background: 'var(--color-background)'
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
						<LibraryIcon size={24} color="var(--color-text-primary)" />
						<h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
							{selectedBook ? (reading ? '阅读' : '图书详情') : '搜索图书'}
						</h2>
					</div>
					<button
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							fontSize: '28px',
							lineHeight: '1',
							cursor: 'pointer',
							color: 'var(--color-text-secondary)',
							padding: '4px 12px',
							borderRadius: '8px',
							transition: 'all 0.2s',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: '36px',
							height: '36px'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'var(--color-background-subtle)';
							e.currentTarget.style.color = 'var(--color-text-primary)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'transparent';
							e.currentTarget.style.color = 'var(--color-text-secondary)';
						}}
					>
						×
					</button>
				</div>

				{/* 内容区域 */}
				<div style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'var(--color-background)' }}>
					{!selectedBook ? (
						/* 搜索界面 */
						<>
							{/* 搜索框 */}
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '12px',
									marginBottom: '24px',
									background: 'var(--color-background-paper)',
									borderRadius: '24px',
									border: '1px solid var(--color-border)',
									padding: '4px 4px 4px 16px',
									transition: 'border-color 0.2s, box-shadow 0.2s',
									boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
								}}
								onFocus={(e) => {
									e.currentTarget.style.borderColor = 'var(--color-primary)';
									e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb), 0.1), 0 1px 2px rgba(0,0,0,0.05)';
								}}
								onBlur={(e) => {
									e.currentTarget.style.borderColor = 'var(--color-border)';
									e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
								}}
							>
								<span style={{ fontSize: '18px', opacity: 0.6 }}>🔍</span>
								<input
									ref={searchInputRef}
									type="text"
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' && !searching && query.trim()) {
											handleSearch();
										}
										if (e.key === 'Escape') {
											onClose();
										}
									}}
									placeholder="搜索书名、作者..."
									style={{
										flex: 1,
										padding: '12px 0',
										border: 'none',
										background: 'transparent',
										fontSize: '15px',
										fontFamily: 'var(--font-family)',
										color: 'var(--color-text-primary)',
										outline: 'none'
									}}
									disabled={searching}
								/>
								<button
									onClick={handleSearch}
									disabled={searching || !query.trim()}
									style={{
										padding: '10px 24px',
										background: searching || !query.trim()
											? 'var(--color-background-subtle)'
											: 'var(--color-primary)',
										color: searching || !query.trim() ? 'var(--color-text-secondary)' : 'white',
										border: 'none',
										borderRadius: '20px',
										cursor: searching || !query.trim() ? 'not-allowed' : 'pointer',
										fontSize: '14px',
										fontWeight: 500,
										transition: 'all 0.2s',
										opacity: searching || !query.trim() ? 0.6 : 1
									}}
									onMouseEnter={(e) => {
										if (!searching && query.trim()) {
											e.currentTarget.style.opacity = '0.9';
										}
									}}
									onMouseLeave={(e) => {
										if (!searching && query.trim()) {
											e.currentTarget.style.opacity = '1';
										}
									}}
								>
									{searching ? '搜索中...' : '搜索'}
								</button>
							</div>

							{/* 搜索结果 */}
							{searching && (
								<div style={{ textAlign: 'center', padding: '60px 20px' }}>
									<div
										style={{
											width: 40,
											height: 40,
											border: '3px solid var(--color-border)',
											borderTopColor: 'var(--color-primary)',
											borderRadius: '50%',
											animation: 'spin 1s linear infinite',
											margin: '0 auto 16px'
										}}
									/>
									<p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>搜索中...</p>
									<style>{`
										@keyframes spin {
											to { transform: rotate(360deg); }
										}
									`}</style>
								</div>
							)}

							{results.length > 0 && !searching && (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
									{results.map((book, index) => (
										<div
											key={book.id || index}
											onClick={() => handleSelectBook(book)}
											style={{
												display: 'flex',
												gap: '16px',
												padding: '16px',
												border: '1px solid var(--color-border-light)',
												borderRadius: '16px',
												cursor: 'pointer',
												transition: 'all 0.2s',
												background: 'var(--color-background-paper)',
												boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.background = 'var(--color-background-subtle)';
												e.currentTarget.style.borderColor = 'var(--color-primary)';
												e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
												e.currentTarget.style.transform = 'translateY(-2px)';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.background = 'var(--color-background-paper)';
												e.currentTarget.style.borderColor = 'var(--color-border-light)';
												e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
												e.currentTarget.style.transform = 'translateY(0)';
											}}
										>
											{book.coverUrl ? (
												<img
													src={book.coverUrl}
													alt={book.title}
													style={{
														width: '80px',
														height: '120px',
														objectFit: 'cover',
														borderRadius: '12px',
														flexShrink: 0,
														boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
													}}
												/>
											) : (
												<div
													style={{
														width: '80px',
														height: '120px',
														background: 'var(--color-background-subtle)',
														borderRadius: '12px',
														flexShrink: 0,
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														color: 'var(--color-text-secondary)',
														fontSize: '32px'
													}}
												>
													<LibraryIcon size={24} color="var(--color-text-secondary)" />
												</div>
											)}
											<div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
												<h3
													style={{
														margin: 0,
														marginBottom: '8px',
														fontSize: '18px',
														fontWeight: 600,
														color: 'var(--color-text-primary)',
														lineHeight: '1.4'
													}}
												>
													{book.title}
												</h3>
												{book.author && (
													<p
														style={{
															margin: 0,
															marginBottom: '4px',
															fontSize: '14px',
															color: 'var(--color-text-secondary)'
														}}
													>
														作者：{book.author}
													</p>
												)}
												{book.id && (
													<span
														style={{
															display: 'inline-block',
															marginTop: '8px',
															padding: '4px 8px',
															background: 'var(--color-primary-lighter)',
															color: 'var(--color-primary)',
															borderRadius: '6px',
															fontSize: '12px',
															fontWeight: 500
														}}
													>
														已保存
													</span>
												)}
											</div>
										</div>
									))}
								</div>
							)}

							{results.length === 0 && query && !searching && (
								<div
									style={{
										textAlign: 'center',
										padding: '60px 20px',
										color: 'var(--color-text-secondary)'
									}}
								>
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', opacity: 0.5 }}>
										<BookIcon size={48} color="var(--color-text-secondary)" />
									</div>
									<p style={{ margin: 0, fontSize: '16px' }}>未找到相关书籍</p>
									<p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.7 }}>
										尝试使用其他关键词搜索
									</p>
								</div>
							)}
						</>
					) : !reading ? (
						/* 图书详情界面 */
						<div>
							<button
								onClick={handleBack}
								style={{
									marginBottom: '20px',
									padding: '8px 16px',
									background: 'var(--color-background-subtle)',
									border: '1px solid var(--color-border-light)',
									borderRadius: '12px',
									cursor: 'pointer',
									fontSize: '14px',
									color: 'var(--color-text-primary)',
									display: 'flex',
									alignItems: 'center',
									gap: '6px',
									transition: 'all 0.2s'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = 'var(--color-background)';
									e.currentTarget.style.borderColor = 'var(--color-primary)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = 'var(--color-background-subtle)';
									e.currentTarget.style.borderColor = 'var(--color-border-light)';
								}}
							>
								← 返回搜索结果
							</button>

							<div
								style={{
									display: 'grid',
									gridTemplateColumns: '180px 1fr',
									gap: '24px',
									marginBottom: '24px',
									padding: '20px',
									background: 'var(--color-background-paper)',
									borderRadius: '16px',
									border: '1px solid var(--color-border-light)'
								}}
							>
								{/* 封面 */}
								<div>
									{selectedBook.coverUrl ? (
										<img
											src={selectedBook.coverUrl}
											alt={selectedBook.title}
											style={{
												width: '100%',
												borderRadius: '12px',
												boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
											}}
										/>
									) : (
										<div
											style={{
												width: '100%',
												aspectRatio: '2/3',
												background: 'var(--color-background-subtle)',
												borderRadius: '12px',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												color: 'var(--color-text-secondary)',
												fontSize: '48px'
											}}
										>
											<LibraryIcon size={48} color="var(--color-text-secondary)" />
										</div>
									)}
								</div>

								{/* 图书信息 */}
								<div>
									<h2
										style={{
											margin: 0,
											marginBottom: '12px',
											fontSize: '24px',
											fontWeight: 700,
											color: 'var(--color-text-primary)',
											lineHeight: '1.3'
										}}
									>
										{selectedBook.title}
									</h2>
									{selectedBook.author && (
										<p
											style={{
												margin: 0,
												marginBottom: '16px',
												fontSize: '16px',
												color: 'var(--color-text-secondary)'
											}}
										>
											作者：{selectedBook.author}
										</p>
									)}
									{selectedBook.overview && (
										<div
											style={{
											marginBottom: '20px',
											padding: '16px',
											background: 'var(--color-background)',
											borderRadius: '12px'
										}}
										>
											<p
												style={{
													margin: 0,
													fontSize: '14px',
													color: 'var(--color-text-secondary)',
													lineHeight: 1.6
												}}
											>
												{selectedBook.overview}
											</p>
										</div>
									)}

									{/* 操作按钮 */}
									<div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
										{selectedBook.assets && selectedBook.assets.length > 0 ? (
											selectedBook.assets.map((asset) => (
												<button
													key={asset.id}
													onClick={() => handleRead(asset)}
													style={{
														padding: '12px 24px',
														background: 'var(--color-primary)',
														color: 'white',
														border: 'none',
														borderRadius: '20px',
														cursor: 'pointer',
														fontSize: '14px',
														fontWeight: 500,
														transition: 'all 0.2s',
														display: 'flex',
														alignItems: 'center',
														gap: '8px'
													}}
													onMouseEnter={(e) => {
														e.currentTarget.style.opacity = '0.9';
														e.currentTarget.style.transform = 'translateY(-1px)';
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.opacity = '1';
														e.currentTarget.style.transform = 'translateY(0)';
													}}
												>
													<BookIcon size={16} color="currentColor" />
													阅读
												</button>
											))
										) : (
											<>
												<button
													onClick={handleInsertBook}
													style={{
														padding: '12px 24px',
														background: 'var(--color-primary)',
														color: 'white',
														border: 'none',
														borderRadius: '20px',
														cursor: 'pointer',
														fontSize: '14px',
														fontWeight: 500,
														transition: 'all 0.2s',
														display: 'flex',
														alignItems: 'center',
														gap: '8px'
													}}
													onMouseEnter={(e) => {
														e.currentTarget.style.opacity = '0.9';
														e.currentTarget.style.transform = 'translateY(-1px)';
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.opacity = '1';
														e.currentTarget.style.transform = 'translateY(0)';
													}}
												>
													<MessageIcon size={16} color="currentColor" />
													插入到消息
												</button>
												<a
													href={selectedBook.id ? `/books/${selectedBook.id}` : '/library'}
													target="_blank"
													rel="noopener noreferrer"
													style={{
														padding: '12px 24px',
														background: 'var(--color-background-subtle)',
														color: 'var(--color-text-primary)',
														border: '1px solid var(--color-border-light)',
														borderRadius: '20px',
														textDecoration: 'none',
														fontSize: '14px',
														fontWeight: 500,
														display: 'inline-flex',
														alignItems: 'center',
														gap: '8px',
														transition: 'all 0.2s'
													}}
													onMouseEnter={(e) => {
														e.currentTarget.style.background = 'var(--color-background)';
														e.currentTarget.style.borderColor = 'var(--color-primary)';
														e.currentTarget.style.transform = 'translateY(-1px)';
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.background = 'var(--color-background-subtle)';
														e.currentTarget.style.borderColor = 'var(--color-border-light)';
														e.currentTarget.style.transform = 'translateY(0)';
													}}
												>
													<span>🔗</span>
													查看详情
												</a>
											</>
										)}
									</div>
								</div>
							</div>
						</div>
					) : (
						/* 阅读界面 */
						<div>
							<div
								style={{
									marginBottom: '20px',
									padding: '16px 20px',
									background: 'var(--color-background-paper)',
									borderRadius: '16px',
									border: '1px solid var(--color-border-light)',
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center'
								}}
							>
								<button
									onClick={handleBack}
									style={{
										padding: '8px 16px',
										background: 'var(--color-background-subtle)',
										border: '1px solid var(--color-border-light)',
										borderRadius: '12px',
										cursor: 'pointer',
										fontSize: '14px',
										color: 'var(--color-text-primary)',
										display: 'flex',
										alignItems: 'center',
										gap: '6px',
										transition: 'all 0.2s'
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.background = 'var(--color-background)';
										e.currentTarget.style.borderColor = 'var(--color-primary)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.background = 'var(--color-background-subtle)';
										e.currentTarget.style.borderColor = 'var(--color-border-light)';
									}}
								>
									← 返回详情
								</button>
								<h3 
									style={{ 
										margin: 0, 
										fontSize: '18px',
										fontWeight: 600,
										color: 'var(--color-text-primary)',
										flex: 1,
										textAlign: 'center',
										padding: '0 20px'
									}}
								>
									{selectedBook.title}
								</h3>
								<div style={{ width: '100px' }} /> {/* 占位符，保持居中 */}
							</div>
							<div
								style={{
									background: 'var(--color-background-paper)',
									borderRadius: '16px',
									border: '1px solid var(--color-border-light)',
									padding: '20px',
									minHeight: '400px'
								}}
							>
								{selectedAsset && (
									<EpubReader src={`/api/files/${encodeURIComponent(selectedAsset.fileKey)}`} />
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

