'use client';
import { useState, useEffect } from 'react';
import ResponseTemplate from '@/components/editor/ResponseTemplate';
import LazyTopicList from '@/components/lazy/LazyTopicList';
import TopicSearch from '@/components/topic/TopicSearch';
import { useAuth } from '@/contexts/AuthContext';
import { MessageIcon, FileIcon, LibraryIcon, ClockIcon, RocketIcon, CheckCircleIcon, XCircleIcon, SparklesIcon, LoadingSpinner } from '@/components/ui/Icons';

export default function UploadPage() {
	const { user } = useAuth();
	const isAdmin = user?.role === 'admin';
	
	const [file, setFile] = useState<File | null>(null);
	const [title, setTitle] = useState<string>('');
	const [msg, setMsg] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState<string>('');
	const [bannerImage, setBannerImage] = useState<string | null>(null);
	const [bannerFile, setBannerFile] = useState<File | null>(null);
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
	
	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMsg(null);
		setProgress('');
		if (!file) {
			setMsg('请选择文件');
			return;
		}
		if (!title.trim()) {
			setMsg('请输入话题标题');
			return;
		}
		
		setUploading(true);
		try {
			setProgress('初始化上传...');
			const initRes = await fetch('/api/uploads/initiate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filename: file.name, size: file.size })
			});
			
			// Check if response is JSON
			const contentType = initRes.headers.get('content-type');
			if (!contentType || !contentType.includes('application/json')) {
				const text = await initRes.text();
				console.error('[Upload] Non-JSON response from initiate:', text.substring(0, 200));
				setMsg('服务器响应格式错误，请稍后重试');
				setUploading(false);
				return;
			}
			
			const init = await initRes.json();
			if (!initRes.ok) {
				setMsg(init.error || '初始化失败');
				setUploading(false);
				return;
			}
			
			setProgress('上传文件中...');
			// Local storage uses POST, OSS uses PUT
			const uploadMethod = init.local ? 'POST' : 'PUT';
			const uploadRes = await fetch(init.uploadUrl, { 
				method: uploadMethod, 
				headers: init.local ? {} : { 'Content-Type': init.contentType }, 
				body: file 
			});
			if (!uploadRes.ok) {
				setMsg('上传失败');
				setUploading(false);
				return;
			}
			
			setProgress('创建话题中...');
			const doneRes = await fetch('/api/uploads/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					key: init.key, 
					mime: init.contentType, 
					size: file.size,
					title: title.trim()
				})
			});
			
			// Check if response is JSON
			const doneContentType = doneRes.headers.get('content-type');
			if (!doneContentType || !doneContentType.includes('application/json')) {
				const text = await doneRes.text();
				console.error('[Upload] Non-JSON response from complete:', text.substring(0, 200));
				setMsg('服务器响应格式错误，请稍后重试');
				setUploading(false);
				return;
			}
			
			const done = await doneRes.json();
			if (!doneRes.ok) {
				setMsg(done.error || '完成失败');
				setUploading(false);
				return;
			}
			
			setProgress('上传成功！正在跳转...');
			// Small delay to show success message
			setTimeout(() => {
				location.href = `/topics/${done.topicId}`;
			}, 500);
		} catch (err: any) {
			setMsg(err.message || '上传过程中出错');
			setUploading(false);
		}
	};
	return (
		<main style={{ 
			padding: 'var(--spacing-xl)', 
			maxWidth: 1400, 
			margin: '0 auto',
			background: 'var(--color-background)',
			minHeight: 'calc(100vh - 200px)'
		}}>
			{/* 页面标题 - Banner区域 */}
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
							backgroundImage: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
							WebkitBackgroundClip: 'text',
							WebkitTextFillColor: 'transparent',
							backgroundClip: 'text'
						}),
						letterSpacing: '-0.02em'
					}}>文章</h1>
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
						通过多角度、多层次的严肃讨论，分析不同观点，识别共识与分歧，逐步接近事实真相
					</p>
				</div>
				{/* Banner上传按钮 - 仅管理员可见 */}
				{isAdmin && (
					<>
						<label
							htmlFor="banner-upload"
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
							id="banner-upload"
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

			{/* 搜索框 */}
			<div style={{ marginBottom: 'var(--spacing-xxl)' }}>
				<TopicSearch />
			</div>

			{/* 发起话题表单 */}
			<div className="card-academic" style={{ 
				marginBottom: 'var(--spacing-xxl)',
				background: 'var(--color-background-paper)',
				borderRadius: 'var(--radius-lg)',
				padding: 'var(--spacing-xxl)',
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
						background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0
					}}>
						<MessageIcon size={24} color="white" />
					</div>
					<div>
						<h2 style={{ 
							marginTop: 0,
							marginBottom: 'var(--spacing-xs)',
							fontSize: 'var(--font-size-2xl)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>发起新话题</h2>
						<p style={{ 
							color: 'var(--color-text-secondary)',
							fontSize: 'var(--font-size-sm)',
							lineHeight: 'var(--line-height-relaxed)',
							margin: 0
						}}>
							支持格式：doc, docx, txt, md, pdf, rtf（单文件 ≤ 20MB）
						</p>
					</div>
				</div>
				<form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="title" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)',
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-xs)'
						}}>
							话题标题 <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-lg)' }}>*</span>
						</label>
						<input 
							id="title"
							type="text" 
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="请输入话题标题，例如：人工智能对教育的影响"
							disabled={uploading}
							required
							style={{
								padding: 'var(--spacing-md) var(--spacing-lg)',
								border: '2px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								background: 'var(--color-background)',
								fontSize: 'var(--font-size-base)',
								color: 'var(--color-text-primary)',
								cursor: uploading ? 'not-allowed' : 'text',
								transition: 'all var(--transition-fast)',
								fontFamily: 'var(--font-family)'
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-lighter)';
								e.currentTarget.style.background = 'var(--color-background-paper)';
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.boxShadow = 'none';
								e.currentTarget.style.background = 'var(--color-background)';
							}}
						/>
						<p style={{ 
							fontSize: 'var(--font-size-xs)',
							color: 'var(--color-text-secondary)',
							margin: 0,
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-xs)'
						}}>
							<SparklesIcon size={14} color="var(--color-text-secondary)" />
							<span>AI 将根据文档内容生成副标题（异步处理）</span>
						</p>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="file" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)',
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--spacing-xs)'
						}}>
							文档文件 <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-lg)' }}>*</span>
						</label>
						<div style={{
							position: 'relative',
							border: '2px dashed var(--color-border)',
							borderRadius: 'var(--radius-md)',
							padding: 'var(--spacing-xl)',
							background: 'var(--color-background-subtle)',
							transition: 'all var(--transition-fast)',
							cursor: uploading ? 'not-allowed' : 'pointer'
						}}
						onMouseEnter={(e) => {
							if (!uploading) {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.background = 'var(--color-primary-lighter)';
							}
						}}
						onMouseLeave={(e) => {
							if (!uploading) {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.background = 'var(--color-background-subtle)';
							}
						}}
						>
							<input 
								id="file"
								type="file" 
								onChange={(e) => setFile(e.target.files?.[0] || null)} 
								disabled={uploading}
								required
								accept=".doc,.docx,.txt,.md,.pdf,.rtf"
								style={{
									position: 'absolute',
									inset: 0,
									opacity: 0,
									cursor: uploading ? 'not-allowed' : 'pointer',
									zIndex: 1
								}}
							/>
							<div style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: 'var(--spacing-sm)',
								pointerEvents: 'none'
							}}>
								<FileIcon size={48} color="var(--color-text-tertiary)" />
								<div style={{
									fontSize: 'var(--font-size-base)',
									fontWeight: 500,
									color: 'var(--color-text-primary)'
								}}>
									{file ? file.name : '点击或拖拽文件到此处'}
								</div>
								{file && (
									<div style={{
										fontSize: 'var(--font-size-xs)',
										color: 'var(--color-text-secondary)'
									}}>
										{(file.size / 1024 / 1024).toFixed(2)} MB
									</div>
								)}
							</div>
						</div>
					</div>
					<button 
						type="submit" 
						disabled={!file || !title.trim() || uploading} 
						className="btn-academic-primary"
						style={{
							padding: 'var(--spacing-md) var(--spacing-xl)',
							fontSize: 'var(--font-size-base)',
							fontWeight: 600,
							borderRadius: 'var(--radius-md)',
							opacity: (!file || !title.trim() || uploading) ? 0.6 : 1,
							cursor: (!file || !title.trim() || uploading) ? 'not-allowed' : 'pointer',
							transition: 'all var(--transition-fast)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 'var(--spacing-sm)',
							marginTop: 'var(--spacing-md)'
						}}
						onMouseEnter={(e) => {
							if (!(!file || !title.trim() || uploading)) {
								e.currentTarget.style.transform = 'translateY(-2px)';
								e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
							}
						}}
						onMouseLeave={(e) => {
							if (!(!file || !title.trim() || uploading)) {
								e.currentTarget.style.transform = 'translateY(0)';
								e.currentTarget.style.boxShadow = 'none';
							}
						}}
					>
						{uploading ? (
							<>
								<LoadingSpinner size={20} color="currentColor" />
								上传中...
							</>
						) : (
							<>
								<RocketIcon size={20} color="currentColor" />
								上传并创建话题
							</>
						)}
					</button>
				</form>
				{progress && (
					<div style={{ 
						marginTop: 'var(--spacing-lg)',
						padding: 'var(--spacing-md) var(--spacing-lg)',
						background: 'linear-gradient(135deg, var(--color-primary-lighter) 0%, rgba(59, 130, 246, 0.1) 100%)',
						borderLeft: '4px solid var(--color-primary)',
						borderRadius: 'var(--radius-md)',
						color: 'var(--color-primary-dark)',
						fontWeight: 500,
						fontSize: 'var(--font-size-sm)',
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-sm)',
						boxShadow: 'var(--shadow-sm)'
					}}>
						<ClockIcon size={20} color="currentColor" />
						{progress}
					</div>
				)}
				{msg && (
					<div style={{ 
						marginTop: 'var(--spacing-lg)',
						padding: 'var(--spacing-md) var(--spacing-lg)',
						color: msg.includes('成功') ? 'var(--color-success)' : 'var(--color-error)',
						background: msg.includes('成功') 
							? 'linear-gradient(135deg, rgba(45, 122, 50, 0.1) 0%, rgba(45, 122, 50, 0.05) 100%)' 
							: 'linear-gradient(135deg, rgba(198, 40, 40, 0.1) 0%, rgba(198, 40, 40, 0.05) 100%)',
						borderLeft: `4px solid ${msg.includes('成功') ? 'var(--color-success)' : 'var(--color-error)'}`,
						borderRadius: 'var(--radius-md)',
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500,
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-sm)',
						boxShadow: 'var(--shadow-sm)'
					}}>
						{msg.includes('成功') ? (
							<CheckCircleIcon size={20} color="currentColor" />
						) : (
							<XCircleIcon size={20} color="currentColor" />
						)}
						{msg}
					</div>
				)}
			</div>
			<ResponseTemplate />

			{/* 话题列表 */}
			<div style={{ marginTop: 'var(--spacing-xxl)' }}>
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
						background: 'var(--color-primary-lighter)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0
					}}>
						<LibraryIcon size={20} color="var(--color-primary)" />
					</div>
					<h2 style={{ 
						margin: 0,
						fontSize: 'var(--font-size-2xl)',
						fontWeight: 600,
						color: 'var(--color-text-primary)'
					}}>所有话题</h2>
				</div>
				<LazyTopicList />
			</div>
		</main>
	);
}


