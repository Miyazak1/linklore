'use client';
import { useState } from 'react';
import EpubReader from '@/components/reader/EpubReader';

type Book = {
	id: string;
	title: string;
	author: string | null;
	coverUrl: string | null;
	overview: string | null;
	source: string | null;
	createdAt: string; // ISO string from server
	assets: Array<{ id: string; fileKey: string; mime: string; createdAt: string }>; // ISO strings
};

export default function BookDetail({ book }: { book: Book }) {
	const [reading, setReading] = useState(false);
	const [selectedAsset, setSelectedAsset] = useState<{ id: string; fileKey: string; mime: string } | null>(null);

	const onRead = (asset: { id: string; fileKey: string; mime: string }) => {
		setSelectedAsset(asset);
		setReading(true);
	};

	const onDownload = (asset: { fileKey: string; mime: string }) => {
		// Get file URL
		const url = `/api/files/${encodeURIComponent(asset.fileKey)}`;
		window.open(url, '_blank');
	};

	return (
		<div>
			<div style={{ marginBottom: 'var(--spacing-xl)' }}>
				<a 
					href="/library" 
					className="academic-link"
					style={{ 
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500
					}}
				>
					← 返回图书馆
				</a>
			</div>

			{!reading ? (
				<div className="book-detail-grid" style={{ 
					display: 'grid', 
					gridTemplateColumns: '300px 1fr', 
					gap: 'var(--spacing-xxl)'
				}}>
					{/* Book Cover and Info */}
					<div>
						{book.coverUrl ? (
							<img
								src={book.coverUrl}
								alt={book.title}
								style={{ 
									width: '100%', 
									borderRadius: 'var(--radius-lg)', 
									marginBottom: 'var(--spacing-lg)', 
									boxShadow: 'var(--shadow-md)'
								}}
							/>
						) : (
							<div
								className="card"
								style={{
									width: '100%',
									aspectRatio: '3/4',
									background: 'var(--color-background-subtle)',
									borderRadius: 'var(--radius-lg)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: 'var(--color-text-tertiary)',
									fontSize: 'var(--font-size-lg)',
									marginBottom: 'var(--spacing-lg)',
									border: '1px solid var(--color-border-light)'
								}}
							>
								无封面
							</div>
						)}
					</div>

					{/* Book Details */}
					<div>
						<h1 style={{ 
							marginBottom: 'var(--spacing-sm)',
							fontSize: 'var(--font-size-3xl)',
							fontWeight: 700,
							color: 'var(--color-primary)'
						}}>
							{book.title}
						</h1>
						{book.author && (
							<p style={{ 
								fontSize: 'var(--font-size-lg)', 
								color: 'var(--color-text-secondary)', 
								marginBottom: 'var(--spacing-lg)',
								fontWeight: 500
							}}>
								作者：{book.author}
							</p>
						)}
						{book.overview && (
							<div className="card-academic" style={{ 
								marginBottom: 'var(--spacing-xl)',
								padding: 'var(--spacing-lg)',
								borderLeftColor: 'var(--color-accent-cool)'
							}}>
								<h3 style={{ 
									marginTop: 0,
									marginBottom: 'var(--spacing-md)',
									fontSize: 'var(--font-size-xl)',
									color: 'var(--color-text-primary)'
								}}>
									简介
								</h3>
								<p style={{ 
									lineHeight: 'var(--line-height-relaxed)', 
									color: 'var(--color-text-primary)',
									fontSize: 'var(--font-size-base)',
									margin: 0
								}}>
									{book.overview}
								</p>
							</div>
						)}
						<div style={{ 
							marginBottom: 'var(--spacing-lg)', 
							fontSize: 'var(--font-size-sm)', 
							color: 'var(--color-text-secondary)',
							paddingBottom: 'var(--spacing-md)',
							borderBottom: '1px solid var(--color-border-light)'
						}}>
							<strong>添加时间：</strong>{new Date(book.createdAt).toLocaleString('zh-CN')}
							{book.source && (
								<span>
									{' · '}
									<strong>来源：</strong>
									{book.source === 'openlibrary' ? 'Open Library' : book.source === 'manual' ? '手动添加' : book.source}
								</span>
							)}
						</div>

						{/* Book Assets */}
						{book.assets.length > 0 ? (
							<div style={{ marginTop: 'var(--spacing-xl)' }}>
								<h3 style={{ 
									marginBottom: 'var(--spacing-lg)',
									fontSize: 'var(--font-size-xl)',
									paddingBottom: 'var(--spacing-md)',
									borderBottom: '2px solid var(--color-border-light)'
								}}>
									电子书文件 <span style={{ 
										color: 'var(--color-text-secondary)',
										fontSize: 'var(--font-size-base)',
										fontWeight: 400
									}}>({book.assets.length})</span>
								</h3>
								<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
									{book.assets.map((asset) => {
										const isEpub = asset.mime === 'application/epub+zip' || asset.fileKey.endsWith('.epub');
										const isPdf = asset.mime === 'application/pdf' || asset.fileKey.endsWith('.pdf');
										return (
											<div
												key={asset.id}
												className="card-academic"
												style={{
													padding: 'var(--spacing-lg)',
													borderLeftColor: isEpub ? 'var(--color-primary)' : isPdf ? 'var(--color-error)' : 'var(--color-secondary)',
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
													flexWrap: 'wrap',
													gap: 'var(--spacing-md)'
												}}
											>
												<div>
													<div style={{ 
														fontWeight: 600, 
														marginBottom: 'var(--spacing-xs)',
														fontSize: 'var(--font-size-base)',
														color: 'var(--color-text-primary)'
													}}>
														{isEpub ? 'EPUB' : isPdf ? 'PDF' : asset.mime}
													</div>
													<div style={{ 
														fontSize: 'var(--font-size-xs)', 
														color: 'var(--color-text-tertiary)'
													}}>
														{new Date(asset.createdAt).toLocaleString('zh-CN')}
													</div>
												</div>
												<div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
													{isEpub && (
														<button
															type="button"
															onClick={() => onRead(asset)}
															className="btn-academic-primary"
															style={{
																padding: 'var(--spacing-sm) var(--spacing-md)',
																fontSize: 'var(--font-size-sm)',
																fontWeight: 600
															}}
														>
															在线阅读
														</button>
													)}
													<button
														type="button"
														onClick={() => onDownload(asset)}
														className="btn-academic"
														style={{
															padding: 'var(--spacing-sm) var(--spacing-md)',
															fontSize: 'var(--font-size-sm)',
															background: 'var(--color-success)',
															borderColor: 'var(--color-success)',
															color: '#fff',
															fontWeight: 600
														}}
													>
														下载
													</button>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						) : (
							<div className="card-academic" style={{ 
								marginTop: 'var(--spacing-xl)', 
								padding: 'var(--spacing-xl)', 
								textAlign: 'center',
								borderLeftColor: 'var(--color-text-tertiary)'
							}}>
								<p style={{ 
									color: 'var(--color-text-secondary)',
									fontSize: 'var(--font-size-base)',
									margin: 0
								}}>
									暂无电子书文件
								</p>
							</div>
						)}
					</div>
				</div>
			) : selectedAsset ? (
				<div>
					<div className="card-academic" style={{ 
						marginBottom: 'var(--spacing-lg)',
						padding: 'var(--spacing-lg)',
						borderLeftColor: 'var(--color-primary)',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						flexWrap: 'wrap',
						gap: 'var(--spacing-md)'
					}}>
						<h2 style={{ 
							margin: 0,
							fontSize: 'var(--font-size-2xl)',
							color: 'var(--color-primary)'
						}}>
							{book.title}
						</h2>
						<button
							type="button"
							onClick={() => {
								setReading(false);
								setSelectedAsset(null);
							}}
							className="btn-academic"
							style={{
								padding: 'var(--spacing-sm) var(--spacing-md)',
								fontSize: 'var(--font-size-sm)',
								fontWeight: 600
							}}
						>
							返回详情
						</button>
					</div>
					<EpubReader src={`/api/files/${encodeURIComponent(selectedAsset.fileKey)}`} />
				</div>
			) : null}
		</div>
	);
}

