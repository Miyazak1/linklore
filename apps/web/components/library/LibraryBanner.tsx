'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FileIcon } from '@/components/ui/Icons';

interface LibraryBannerProps {
	title: string;
	description: string;
}

export default function LibraryBanner({ title, description }: LibraryBannerProps) {
	const { user } = useAuth();
	const isAdmin = user?.role === 'admin';
	
	const [bannerImage, setBannerImage] = useState<string | null>(null);
	const [uploadingBanner, setUploadingBanner] = useState(false);

	// 加载banner图片
	useEffect(() => {
		const loadBanner = async () => {
			try {
				const res = await fetch('/api/admin/banner');
				if (res.ok) {
					const data = await res.json();
					if (data.bannerUrl) {
						setBannerImage(data.bannerUrl);
					}
				}
			} catch (err) {
				console.error('加载banner失败', err);
			}
		};
		loadBanner();
	}, []);

	return (
		<div style={{ 
			marginBottom: 'var(--spacing-xxl)',
			position: 'relative',
			borderRadius: 'var(--radius-lg)',
			overflow: 'hidden',
			border: '1px solid var(--color-border-light)',
			boxShadow: 'var(--shadow-md)',
			minHeight: '300px',
			maxHeight: '400px',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center'
		}}>
			{/* Banner背景图片 */}
			{bannerImage && (
				<img
					src={bannerImage}
					alt="Banner"
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						objectFit: 'cover',
						objectPosition: 'center',
						zIndex: 0
					}}
				/>
			)}
			{/* 遮罩层，确保文字可读性 */}
			<div style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				background: bannerImage 
					? 'linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.6) 100%)'
					: 'transparent',
				zIndex: 1
			}} />
			{/* 内容区域 */}
			<div style={{
				position: 'relative',
				zIndex: 2,
				textAlign: 'center',
				padding: 'var(--spacing-xl)',
				width: '100%'
			}}>
				<h1 style={{ 
					marginTop: 0,
					marginBottom: 'var(--spacing-md)',
					fontSize: 'clamp(2rem, 5vw, 3rem)',
					fontWeight: 700,
					...(bannerImage ? {
						color: '#ffffff',
						textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
					} : {
						backgroundImage: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
						backgroundClip: 'text'
					}),
					letterSpacing: '-0.02em'
				}}>{title}</h1>
				<p style={{ 
					color: bannerImage ? '#ffffff' : 'var(--color-text-secondary)',
					fontSize: 'var(--font-size-lg)',
					lineHeight: 'var(--line-height-relaxed)',
					margin: 0,
					maxWidth: '600px',
					marginLeft: 'auto',
					marginRight: 'auto',
					textShadow: bannerImage ? '0 1px 4px rgba(0, 0, 0, 0.3)' : 'none'
				}}>
					{description}
				</p>
			</div>
			{/* Banner上传按钮 - 仅管理员可见 */}
			{isAdmin && (
				<>
					<label
						htmlFor="library-banner-upload"
						style={{
							position: 'absolute',
							top: 'var(--spacing-md)',
							right: 'var(--spacing-md)',
							padding: 'var(--spacing-sm) var(--spacing-md)',
							background: 'rgba(0, 0, 0, 0.6)',
							color: '#ffffff',
							borderRadius: 'var(--radius-md)',
							cursor: 'pointer',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500,
							zIndex: 3,
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-xs)',
							backdropFilter: 'blur(4px)',
							transition: 'all var(--transition-fast)',
							border: '1px solid rgba(255, 255, 255, 0.2)'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
							e.currentTarget.style.transform = 'translateY(-2px)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
							e.currentTarget.style.transform = 'translateY(0)';
						}}
					>
						<FileIcon size={16} color="currentColor" />
						{uploadingBanner ? '上传中...' : (bannerImage ? '更换图片' : '上传Banner')}
					</label>
					<input
						id="library-banner-upload"
						type="file"
						accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
						onChange={async (e) => {
							const selectedFile = e.target.files?.[0] || null;
							if (!selectedFile) return;

							// 验证文件类型
							const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
							if (!allowedTypes.includes(selectedFile.type)) {
								alert('不支持的文件类型，请上传 JPG、PNG、WEBP 或 GIF 格式的图片');
								return;
							}
							// 验证文件大小（5MB）
							if (selectedFile.size > 5 * 1024 * 1024) {
								alert('文件过大，请上传小于 5MB 的图片');
								return;
							}

							// 预览
							const reader = new FileReader();
							reader.onload = (e) => {
								setBannerImage(e.target?.result as string);
							};
							reader.readAsDataURL(selectedFile);

							// 上传到服务器
							setUploadingBanner(true);
							try {
								const formData = new FormData();
								formData.append('file', selectedFile);
								const res = await fetch('/api/admin/banner', {
									method: 'POST',
									body: formData
								});
								const data = await res.json();
								if (res.ok && data.bannerUrl) {
									setBannerImage(data.bannerUrl);
								} else {
									alert(data.error || '上传失败');
									// 恢复之前的图片
									const bannerRes = await fetch('/api/admin/banner');
									if (bannerRes.ok) {
										const bannerData = await bannerRes.json();
										setBannerImage(bannerData.bannerUrl || null);
									} else {
										setBannerImage(null);
									}
								}
							} catch (err) {
								console.error('上传banner失败', err);
								alert('上传失败，请稍后重试');
								// 恢复之前的图片
								const bannerRes = await fetch('/api/admin/banner');
								if (bannerRes.ok) {
									const bannerData = await bannerRes.json();
									setBannerImage(bannerData.bannerUrl || null);
								} else {
									setBannerImage(null);
								}
							} finally {
								setUploadingBanner(false);
							}
						}}
						disabled={uploadingBanner}
						style={{
							position: 'absolute',
							opacity: 0,
							width: 0,
							height: 0,
							pointerEvents: 'none'
						}}
					/>
					{/* 删除按钮（当有图片时显示） */}
					{bannerImage && (
						<button
							type="button"
							onClick={async () => {
								if (!confirm('确定要删除banner图片吗？')) return;
								
								setUploadingBanner(true);
								try {
									const res = await fetch('/api/admin/banner', {
										method: 'DELETE'
									});
									if (res.ok) {
										setBannerImage(null);
									} else {
										const data = await res.json();
										alert(data.error || '删除失败');
									}
								} catch (err) {
									console.error('删除banner失败', err);
									alert('删除失败，请稍后重试');
								} finally {
									setUploadingBanner(false);
								}
							}}
							disabled={uploadingBanner}
							style={{
								position: 'absolute',
								top: 'var(--spacing-md)',
								right: bannerImage ? '120px' : 'var(--spacing-md)',
								padding: 'var(--spacing-sm) var(--spacing-md)',
								background: uploadingBanner ? 'rgba(198, 40, 40, 0.5)' : 'rgba(198, 40, 40, 0.8)',
								color: '#ffffff',
								border: 'none',
								borderRadius: 'var(--radius-md)',
								cursor: uploadingBanner ? 'not-allowed' : 'pointer',
								fontSize: 'var(--font-size-sm)',
								fontWeight: 500,
								zIndex: 3,
								display: 'flex',
								alignItems: 'center',
								gap: 'var(--spacing-xs)',
								backdropFilter: 'blur(4px)',
								transition: 'all var(--transition-fast)'
							}}
							onMouseEnter={(e) => {
								if (!uploadingBanner) {
									e.currentTarget.style.background = 'rgba(198, 40, 40, 1)';
									e.currentTarget.style.transform = 'translateY(-2px)';
								}
							}}
							onMouseLeave={(e) => {
								if (!uploadingBanner) {
									e.currentTarget.style.background = 'rgba(198, 40, 40, 0.8)';
									e.currentTarget.style.transform = 'translateY(0)';
								}
							}}
						>
							{uploadingBanner ? '删除中...' : '删除'}
						</button>
					)}
				</>
			)}
		</div>
	);
}






