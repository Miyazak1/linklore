'use client';
import { useState, useEffect } from 'react';
import EpubReader from '@/components/reader/EpubReader';
import { createModuleLogger } from '@/lib/utils/logger';
import { CameraIcon, LibraryIcon } from '@/components/ui/Icons';

const log = createModuleLogger('BookDetail');

type Book = {
	id: string;
	title: string;
	author: string | null;
	coverUrl: string | null;
	overview: string | null;
	source: string | null;
	createdAt: string; // ISO string from server
	assets: Array<{ id: string; fileKey: string; mime: string; createdAt: string }>; // ISO strings
	uploaderName?: string | null; // 上传者昵称
};

export default function BookDetail({ book }: { book: Book }) {
	const [reading, setReading] = useState(false);
	const [selectedAsset, setSelectedAsset] = useState<{ id: string; fileKey: string; mime: string } | null>(null);
	const [uploadingCover, setUploadingCover] = useState(false);
	const [coverPreview, setCoverPreview] = useState<string | null>(null);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [canUploadCover, setCanUploadCover] = useState(false);

	const onRead = (asset: { id: string; fileKey: string; mime: string }) => {
		setSelectedAsset(asset);
		setReading(true);
	};

	const onDownload = (asset: { fileKey: string; mime: string }) => {
		// Get file URL
		const url = `/api/files/${encodeURIComponent(asset.fileKey)}`;
		window.open(url, '_blank');
	};

	// 检查当前用户是否有权限上传封面
	useEffect(() => {
		// 获取当前用户信息
		fetch('/api/auth/me')
			.then(async (res) => {
				const data = await res.json();
				if (data.user?.id) {
					const userId = data.user.id;
					setCurrentUserId(userId);
					// 检查是否有任何 asset 的 fileKey 包含当前用户的 userId
					// fileKey 格式：books/{userId}/{timestamp}-{filename}
					const hasPermission = book.assets.some(asset => 
						asset.fileKey.includes(`books/${userId}/`)
					);
					setCanUploadCover(hasPermission);
				} else {
					setCurrentUserId(null);
					setCanUploadCover(false);
				}
			})
			.catch((err) => {
				log.error('获取用户信息失败', err as Error);
				setCurrentUserId(null);
				setCanUploadCover(false);
			});
	}, [book.assets]);

	const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// 验证文件类型
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
		if (!allowedTypes.includes(file.type)) {
			alert('不支持的文件类型，请上传 JPG、PNG、WEBP 或 GIF 格式的图片');
			return;
		}

		// 验证文件大小（5MB）
		if (file.size > 5 * 1024 * 1024) {
			alert('文件过大，请上传小于 5MB 的图片');
			return;
		}

		// 预览
		const reader = new FileReader();
		reader.onload = (e) => {
			setCoverPreview(e.target?.result as string);
		};
		reader.readAsDataURL(file);

		// 上传
		setUploadingCover(true);
		try {
			const formData = new FormData();
			formData.append('cover', file);
			const res = await fetch(`/api/books/${book.id}/cover`, {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || '封面上传失败');
			}

			const data = await res.json();
			// 刷新页面以显示新封面
			window.location.reload();
		} catch (err: any) {
			log.error('封面上传失败', err as Error);
			alert(err.message || '封面上传失败');
			setCoverPreview(null);
		} finally {
			setUploadingCover(false);
		}
	};

	return (
		<div>
			{/* 返回链接 */}
			<div style={{ marginBottom: 'var(--spacing-lg)' }}>
				<a 
					href="/library" 
					style={{ 
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500,
						color: 'var(--color-text-secondary)',
						textDecoration: 'none',
						display: 'inline-flex',
						alignItems: 'center',
						gap: 'var(--spacing-xs)',
						transition: 'color var(--transition-fast)'
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.color = 'var(--color-primary)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.color = 'var(--color-text-secondary)';
					}}
				>
					← 返回图书馆
				</a>
			</div>

			{!reading ? (
				<div className="book-detail-grid" style={{ 
					display: 'grid', 
					gridTemplateColumns: '300px 1fr', 
					gap: 'var(--spacing-xxl)',
					alignItems: 'start'
				}}>
					{/* Book Cover and Info */}
					<div>
						<div 
							className="card-academic"
							style={{ 
								position: 'relative',
								padding: 'var(--spacing-md)',
								background: 'var(--color-background-paper)',
								borderRadius: 'var(--radius-lg)',
								border: '1px solid var(--color-border-light)',
								boxShadow: 'var(--shadow-md)',
								transition: 'all var(--transition-normal)'
							}}
						>
							{coverPreview || book.coverUrl ? (
								<img
									src={coverPreview || book.coverUrl || ''}
									alt={book.title}
									style={{ 
										width: '100%', 
										borderRadius: 'var(--radius-md)', 
										marginBottom: 0,
										boxShadow: 'var(--shadow-lg)',
										aspectRatio: '3/4',
										objectFit: 'cover'
									}}
								/>
							) : (
								<div
									style={{
										width: '100%',
										aspectRatio: '3/4',
										background: 'linear-gradient(135deg, var(--color-background-subtle) 0%, var(--color-background-paper) 100%)',
										borderRadius: 'var(--radius-md)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										color: 'var(--color-text-tertiary)',
										fontSize: 'var(--font-size-lg)',
										border: '2px dashed var(--color-border-light)',
										fontWeight: 500
									}}
								>
									无封面
								</div>
							)}
							{/* 封面上传按钮 - 只有上传该书籍的用户才能看到 */}
							{canUploadCover && (
								<>
									<label
										htmlFor="cover-upload"
										style={{
											position: 'absolute',
											bottom: 'var(--spacing-md)',
											left: '50%',
											transform: 'translateX(-50%)',
											padding: 'var(--spacing-sm) var(--spacing-md)',
											background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.9) 100%)',
											color: '#fff',
											borderRadius: 'var(--radius-md)',
											cursor: uploadingCover ? 'not-allowed' : 'pointer',
											fontSize: 'var(--font-size-sm)',
											opacity: uploadingCover ? 0.6 : 1,
											transition: 'all var(--transition-fast)',
											display: 'flex',
											alignItems: 'center',
											gap: 'var(--spacing-xs)',
											boxShadow: 'var(--shadow-md)',
											fontWeight: 500,
											backdropFilter: 'blur(4px)'
										}}
										onMouseEnter={(e) => {
											if (!uploadingCover) {
												e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 1) 100%)';
												e.currentTarget.style.transform = 'translateX(-50%) translateY(-2px)';
											}
										}}
										onMouseLeave={(e) => {
											if (!uploadingCover) {
												e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.9) 100%)';
												e.currentTarget.style.transform = 'translateX(-50%) translateY(0)';
											}
										}}
									>
										{uploadingCover ? (
											<span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
										) : (
											<CameraIcon size={16} color="currentColor" />
										)}
										{uploadingCover ? '上传中...' : '上传封面'}
									</label>
									<input
										id="cover-upload"
										type="file"
										accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
										onChange={handleCoverUpload}
										disabled={uploadingCover}
										style={{
											position: 'absolute',
											opacity: 0,
											width: 0,
											height: 0,
											pointerEvents: 'none'
										}}
									/>
								</>
							)}
						</div>
					</div>

					{/* Book Details */}
					<div>
						{/* 标题和作者 */}
						<div 
							className="card-academic"
							style={{ 
								padding: 'var(--spacing-xl)',
								marginBottom: 'var(--spacing-lg)',
								background: 'linear-gradient(135deg, var(--color-background-paper) 0%, var(--color-background-subtle) 100%)',
								border: '1px solid var(--color-border-light)',
								borderRadius: 'var(--radius-lg)',
								boxShadow: 'var(--shadow-md)'
							}}
						>
							<h1 style={{ 
								marginTop: 0,
								marginBottom: 'var(--spacing-md)',
								fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
								fontWeight: 700,
								background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
								WebkitBackgroundClip: 'text',
								WebkitTextFillColor: 'transparent',
								backgroundClip: 'text',
								letterSpacing: '-0.02em',
								lineHeight: 1.2
							}}>
								{book.title}
							</h1>
							{book.author && (
								<div style={{ 
									display: 'flex',
									alignItems: 'center',
									gap: 'var(--spacing-sm)',
									marginBottom: 'var(--spacing-md)',
									paddingBottom: 'var(--spacing-md)',
									borderBottom: '1px solid var(--color-border-light)'
								}}>
									<span style={{ 
										fontSize: 'var(--font-size-base)', 
										color: 'var(--color-text-secondary)',
										fontWeight: 500
									}}>
										作者：
									</span>
									<span style={{ 
										fontSize: 'var(--font-size-lg)', 
										color: 'var(--color-text-primary)',
										fontWeight: 600
									}}>
										{book.author}
									</span>
								</div>
							)}
							<div style={{ 
								display: 'flex',
								flexWrap: 'wrap',
								gap: 'var(--spacing-md)',
								fontSize: 'var(--font-size-sm)', 
								color: 'var(--color-text-secondary)'
							}}>
								<span>
									<strong style={{ color: 'var(--color-text-primary)' }}>添加时间：</strong>
									{new Date(book.createdAt).toLocaleString('zh-CN')}
								</span>
								{book.source && (
									<span>
										<strong style={{ color: 'var(--color-text-primary)' }}>来源：</strong>
										{book.source === 'openlibrary' ? 'Open Library' : book.source === 'manual' ? '手动添加' : book.source}
									</span>
								)}
								{book.uploaderName && (
									<span>
										<strong style={{ color: 'var(--color-text-primary)' }}>上传者：</strong>
										{book.uploaderName}
									</span>
								)}
							</div>
						</div>

						{/* 简介 */}
						{book.overview && (
							<div 
								className="card-academic" 
								style={{ 
									marginBottom: 'var(--spacing-lg)',
									padding: 'var(--spacing-xl)',
									background: 'var(--color-background-paper)',
									border: '1px solid var(--color-border-light)',
									borderRadius: 'var(--radius-lg)',
									boxShadow: 'var(--shadow-sm)'
								}}
							>
								<h3 style={{ 
									marginTop: 0,
									marginBottom: 'var(--spacing-md)',
									fontSize: 'var(--font-size-xl)',
									fontWeight: 600,
									color: 'var(--color-text-primary)',
									display: 'flex',
									alignItems: 'center',
									gap: 'var(--spacing-sm)'
								}}>
									<span style={{ width: '4px', height: '24px', background: 'var(--color-primary)', borderRadius: '2px' }}></span>
									简介
								</h3>
								<p style={{ 
									lineHeight: 'var(--line-height-relaxed)', 
									color: 'var(--color-text-primary)',
									fontSize: 'var(--font-size-base)',
									margin: 0,
									whiteSpace: 'pre-wrap'
								}}>
									{book.overview}
								</p>
							</div>
						)}

						{/* Book Assets */}
						{book.assets.length > 0 ? (
							<div 
								className="card-academic"
								style={{ 
									padding: 'var(--spacing-xl)',
									background: 'var(--color-background-paper)',
									border: '1px solid var(--color-border-light)',
									borderRadius: 'var(--radius-lg)',
									boxShadow: 'var(--shadow-sm)'
								}}
							>
								<h3 style={{ 
									marginTop: 0,
									marginBottom: 'var(--spacing-lg)',
									fontSize: 'var(--font-size-xl)',
									fontWeight: 600,
									color: 'var(--color-text-primary)',
									display: 'flex',
									alignItems: 'center',
									gap: 'var(--spacing-sm)'
								}}>
									<span style={{ width: '4px', height: '24px', background: 'var(--color-primary)', borderRadius: '2px' }}></span>
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
												style={{
													padding: 'var(--spacing-lg)',
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
													flexWrap: 'wrap',
													gap: 'var(--spacing-md)',
													background: 'var(--color-background-subtle)',
													border: '1px solid var(--color-border-light)',
													borderRadius: 'var(--radius-md)',
													transition: 'all var(--transition-fast)'
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.background = 'var(--color-background-paper)';
													e.currentTarget.style.borderColor = 'var(--color-primary-light)';
													e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.background = 'var(--color-background-subtle)';
													e.currentTarget.style.borderColor = 'var(--color-border-light)';
													e.currentTarget.style.boxShadow = 'none';
												}}
											>
												<div style={{ flex: 1 }}>
													<div style={{ 
														display: 'flex',
														alignItems: 'center',
														gap: 'var(--spacing-sm)',
														marginBottom: 'var(--spacing-xs)'
													}}>
														<span style={{
															display: 'inline-flex',
															alignItems: 'center',
															justifyContent: 'center',
															width: '32px',
															height: '32px',
															borderRadius: 'var(--radius-sm)',
															background: isEpub 
																? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
																: isPdf
																? 'linear-gradient(135deg, var(--color-error) 0%, rgba(198, 40, 40, 0.9) 100%)'
																: 'var(--color-background-subtle)',
															color: '#fff',
															fontSize: 'var(--font-size-xs)',
															fontWeight: 700,
															boxShadow: 'var(--shadow-xs)'
														}}>
															{isEpub ? 'E' : isPdf ? 'P' : 'F'}
														</span>
														<span style={{ 
															fontWeight: 600, 
															fontSize: 'var(--font-size-base)',
															color: 'var(--color-text-primary)'
														}}>
															{isEpub ? 'EPUB' : isPdf ? 'PDF' : asset.mime}
														</span>
													</div>
													<div style={{ 
														fontSize: 'var(--font-size-xs)', 
														color: 'var(--color-text-tertiary)',
														marginLeft: '44px'
													}}>
														{new Date(asset.createdAt).toLocaleString('zh-CN')}
													</div>
												</div>
												<div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
													{(isEpub || isPdf) && (
														<button
															type="button"
															onClick={() => onRead(asset)}
															className="btn-academic-primary"
															style={{
																padding: 'var(--spacing-sm) var(--spacing-lg)',
																fontSize: 'var(--font-size-sm)',
																fontWeight: 600,
																borderRadius: 'var(--radius-md)',
																transition: 'all var(--transition-fast)'
															}}
															onMouseEnter={(e) => {
																e.currentTarget.style.transform = 'translateY(-2px)';
																e.currentTarget.style.boxShadow = 'var(--shadow-md)';
															}}
															onMouseLeave={(e) => {
																e.currentTarget.style.transform = 'translateY(0)';
																e.currentTarget.style.boxShadow = 'none';
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
															padding: 'var(--spacing-sm) var(--spacing-lg)',
															fontSize: 'var(--font-size-sm)',
															background: 'var(--color-success)',
															borderColor: 'var(--color-success)',
															color: '#fff',
															fontWeight: 600,
															borderRadius: 'var(--radius-md)',
															transition: 'all var(--transition-fast)'
														}}
														onMouseEnter={(e) => {
															e.currentTarget.style.transform = 'translateY(-2px)';
															e.currentTarget.style.boxShadow = 'var(--shadow-md)';
														}}
														onMouseLeave={(e) => {
															e.currentTarget.style.transform = 'translateY(0)';
															e.currentTarget.style.boxShadow = 'none';
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
							<div 
								className="card-academic" 
								style={{ 
									padding: 'var(--spacing-xxl)', 
									textAlign: 'center',
									background: 'var(--color-background-paper)',
									border: '1px solid var(--color-border-light)',
									borderRadius: 'var(--radius-lg)',
									boxShadow: 'var(--shadow-sm)'
								}}
							>
								<div style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									marginBottom: 'var(--spacing-md)',
									opacity: 0.5
								}}>
									<LibraryIcon size={64} color="var(--color-text-secondary)" />
								</div>
								<p style={{ 
									color: 'var(--color-text-secondary)',
									fontSize: 'var(--font-size-base)',
									margin: 0,
									fontWeight: 500
								}}>
									暂无电子书文件
								</p>
							</div>
						)}
					</div>
				</div>
			) : selectedAsset ? (
				<div>
					<div 
						className="card-academic" 
						style={{ 
							marginBottom: 'var(--spacing-lg)',
							padding: 'var(--spacing-xl)',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							flexWrap: 'wrap',
							gap: 'var(--spacing-md)',
							background: 'linear-gradient(135deg, var(--color-background-paper) 0%, var(--color-background-subtle) 100%)',
							border: '1px solid var(--color-border-light)',
							borderRadius: 'var(--radius-lg)',
							boxShadow: 'var(--shadow-md)'
						}}
					>
						<div>
							<h2 style={{ 
								margin: 0,
								marginBottom: 'var(--spacing-xs)',
								fontSize: 'var(--font-size-2xl)',
								fontWeight: 700,
								background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
								WebkitBackgroundClip: 'text',
								WebkitTextFillColor: 'transparent',
								backgroundClip: 'text',
								letterSpacing: '-0.02em'
							}}>
								{book.title}
							</h2>
							{book.author && (
								<p style={{ 
									margin: 0,
									fontSize: 'var(--font-size-base)',
									color: 'var(--color-text-secondary)'
								}}>
									{book.author}
								</p>
							)}
						</div>
						<button
							type="button"
							onClick={() => {
								setReading(false);
								setSelectedAsset(null);
							}}
							className="btn-academic"
							style={{
								padding: 'var(--spacing-md) var(--spacing-lg)',
								fontSize: 'var(--font-size-base)',
								fontWeight: 600,
								borderRadius: 'var(--radius-md)',
								transition: 'all var(--transition-fast)'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.transform = 'translateY(-2px)';
								e.currentTarget.style.boxShadow = 'var(--shadow-md)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.transform = 'translateY(0)';
								e.currentTarget.style.boxShadow = 'none';
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

