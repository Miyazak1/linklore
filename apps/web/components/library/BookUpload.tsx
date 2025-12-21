'use client';
import { useState } from 'react';
import { createModuleLogger } from '@/lib/utils/logger';
import { UploadIcon, LibraryIcon, ImageIconComponent } from '@/components/ui/Icons';

const log = createModuleLogger('BookUpload');

export default function BookUpload() {
	const [file, setFile] = useState<File | null>(null);
	const [coverFile, setCoverFile] = useState<File | null>(null);
	const [coverPreview, setCoverPreview] = useState<string | null>(null);
	const [title, setTitle] = useState('');
	const [author, setAuthor] = useState('');
	const [category, setCategory] = useState('');
	const [tags, setTags] = useState('');
	const [language, setLanguage] = useState('');
	const [isbn, setIsbn] = useState('');
	const [publisher, setPublisher] = useState('');
	const [publishYear, setPublishYear] = useState('');
	const [msg, setMsg] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState<string>('');

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMsg(null);
		setProgress('');
		if (!file) return;

		setUploading(true);
		try {
			setProgress('初始化上传...');
			const initRes = await fetch('/api/books/upload/initiate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filename: file.name, size: file.size })
			});
			const init = await initRes.json();
			if (!initRes.ok) {
				setMsg(init.error || '初始化失败');
				setUploading(false);
				return;
			}

			setProgress('上传文件中...');
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

			setProgress('创建书籍中...');
			// First create or find book
			let bookId = init.bookId;
			if (!bookId) {
				const bookRes = await fetch('/api/books/add', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: title.trim() || file.name.replace(/\.[^/.]+$/, ''),
						author: author.trim() || null,
						source: 'manual',
						category: category.trim() || null,
						tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
						language: language.trim() || null,
						isbn: isbn.trim() || null,
						publisher: publisher.trim() || null,
						publishYear: publishYear.trim() ? parseInt(publishYear.trim()) : null,
					})
				});
				const bookData = await bookRes.json();
				if (!bookRes.ok) {
					setMsg(bookData.error || '创建书籍失败');
					setUploading(false);
					return;
				}
				bookId = bookData.book.id;
			}

			setProgress('关联文件...');
			const doneRes = await fetch('/api/books/upload', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					key: init.key,
					mime: init.contentType,
					size: file.size,
					bookId,
					title: title.trim() || undefined,
					author: author.trim() || undefined,
					category: category.trim() || undefined,
					tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(t => t) : undefined,
					language: language.trim() || undefined,
					isbn: isbn.trim() || undefined,
					publisher: publisher.trim() || undefined,
					publishYear: publishYear.trim() ? parseInt(publishYear.trim()) : undefined,
				})
			});
			const done = await doneRes.json();
			if (!doneRes.ok) {
				setMsg(done.error || '完成失败');
				setUploading(false);
				return;
			}

			// 如果上传了封面，上传封面
			if (coverFile && bookId) {
				setProgress('上传封面中...');
				const coverFormData = new FormData();
				coverFormData.append('cover', coverFile);
				const coverRes = await fetch(`/api/books/${bookId}/cover`, {
					method: 'POST',
					body: coverFormData
				});
				if (!coverRes.ok) {
					const coverError = await coverRes.json();
					log.warn('封面上传失败', { error: coverError.error });
					// 封面上传失败不影响整体流程
				}
			}

			setProgress('上传成功！正在刷新...');
			setFile(null);
			setCoverFile(null);
			setCoverPreview(null);
			setTitle('');
			setAuthor('');
			setCategory('');
			setTags('');
			setLanguage('');
			setIsbn('');
			setPublisher('');
			setPublishYear('');
			setTimeout(() => {
				window.location.reload();
			}, 1000);
		} catch (err: any) {
			setMsg(err.message || '上传过程中出错');
			setUploading(false);
		}
	};

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
					background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0
				}}>
					<UploadIcon size={24} color="white" />
				</div>
				<div>
					<h3 style={{ 
						marginTop: 0, 
						marginBottom: 'var(--spacing-xs)',
						fontSize: 'var(--font-size-2xl)',
						fontWeight: 600,
						color: 'var(--color-text-primary)'
					}}>
						上传电子书
					</h3>
					<p style={{ 
						fontSize: 'var(--font-size-sm)', 
						color: 'var(--color-text-secondary)', 
						margin: 0,
						lineHeight: 'var(--line-height-relaxed)'
					}}>
						支持：EPUB, PDF, MOBI, AZW3（单文件 ≤ 50MB）
					</p>
				</div>
			</div>
			<form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
					<label htmlFor="book-file" style={{ 
						fontSize: 'var(--font-size-sm)',
						fontWeight: 600,
						color: 'var(--color-text-primary)',
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-xs)'
					}}>
						电子书文件 <span style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-lg)' }}>*</span>
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
							id="book-file"
							type="file"
							onChange={(e) => setFile(e.target.files?.[0] || null)}
							disabled={uploading}
							accept=".epub,.pdf,.mobi,.azw3"
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
							<div style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: 'var(--color-primary)',
								opacity: 0.7
							}}>
								<LibraryIcon size={48} color="var(--color-primary)" />
							</div>
							<div style={{
								fontSize: 'var(--font-size-base)',
								fontWeight: 500,
								color: 'var(--color-text-primary)'
							}}>
								{file ? file.name : '点击或拖拽电子书文件到此处'}
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
				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
					<label htmlFor="book-cover" style={{ 
						fontSize: 'var(--font-size-sm)',
						fontWeight: 600,
						color: 'var(--color-text-primary)',
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-xs)'
					}}>
						封面图片（可选）
					</label>
					<div style={{
						position: 'relative',
						border: '2px dashed var(--color-border)',
						borderRadius: 'var(--radius-md)',
						padding: 'var(--spacing-md)',
						background: 'var(--color-background-subtle)',
						transition: 'all var(--transition-fast)',
						cursor: uploading ? 'not-allowed' : 'pointer',
						minHeight: '120px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center'
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
							id="book-cover"
							type="file"
							accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
							onChange={(e) => {
								const selectedFile = e.target.files?.[0] || null;
								setCoverFile(selectedFile);
								if (selectedFile) {
									const reader = new FileReader();
									reader.onload = (e) => {
										setCoverPreview(e.target?.result as string);
									};
									reader.readAsDataURL(selectedFile);
								} else {
									setCoverPreview(null);
								}
							}}
							disabled={uploading}
							style={{
								position: 'absolute',
								inset: 0,
								opacity: 0,
								cursor: uploading ? 'not-allowed' : 'pointer',
								zIndex: 1
							}}
						/>
						{coverPreview ? (
							<div style={{
								width: '100%',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: 'var(--spacing-sm)',
								pointerEvents: 'none'
							}}>
								<img
									src={coverPreview}
									alt="封面预览"
									style={{
										maxWidth: '100%',
										maxHeight: '200px',
										objectFit: 'contain',
										borderRadius: 'var(--radius-sm)'
									}}
								/>
								<div style={{
									fontSize: 'var(--font-size-xs)',
									color: 'var(--color-text-secondary)'
								}}>
									{coverFile?.name} ({((coverFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
								</div>
							</div>
						) : (
							<div style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: 'var(--spacing-sm)',
								pointerEvents: 'none',
								color: 'var(--color-text-secondary)'
							}}>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
								<ImageIconComponent size={32} color="var(--color-text-secondary)" />
							</div>
								<div style={{ fontSize: 'var(--font-size-sm)' }}>
									点击或拖拽封面图片到此处
								</div>
								<div style={{ fontSize: 'var(--font-size-xs)' }}>
									支持：JPG, PNG, WEBP, GIF（≤ 5MB）
								</div>
							</div>
						)}
					</div>
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
					<label htmlFor="book-title" style={{ 
						fontSize: 'var(--font-size-sm)',
						fontWeight: 600,
						color: 'var(--color-text-primary)'
					}}>
						书名（可选，留空使用文件名）
					</label>
					<input
						id="book-title"
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="例如：1984"
						disabled={uploading}
						style={{
							width: '100%',
							padding: 'var(--spacing-md) var(--spacing-lg)',
							border: '2px solid var(--color-border)',
							borderRadius: 'var(--radius-md)',
							fontSize: 'var(--font-size-base)',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)',
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
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
					<label htmlFor="book-author" style={{ 
						fontSize: 'var(--font-size-sm)',
						fontWeight: 600,
						color: 'var(--color-text-primary)'
					}}>
						作者（可选）
					</label>
					<input
						id="book-author"
						type="text"
						value={author}
						onChange={(e) => setAuthor(e.target.value)}
						placeholder="例如：乔治·奥威尔"
						disabled={uploading}
						style={{
							width: '100%',
							padding: 'var(--spacing-md) var(--spacing-lg)',
							border: '2px solid var(--color-border)',
							borderRadius: 'var(--radius-md)',
							fontSize: 'var(--font-size-base)',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)',
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
				</div>
				{/* 分类和标签等元数据 */}
				<div style={{ 
					display: 'grid', 
					gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
					gap: 'var(--spacing-md)',
					paddingTop: 'var(--spacing-md)',
					borderTop: '1px solid var(--color-border-light)'
				}}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="book-category" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							分类（可选）
						</label>
						<select
							id="book-category"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							disabled={uploading}
							style={{
								width: '100%',
								padding: 'var(--spacing-md) var(--spacing-lg)',
								border: '2px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
								cursor: 'pointer',
								fontFamily: 'var(--font-family)'
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-lighter)';
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.boxShadow = 'none';
							}}
						>
							<option value="">选择分类</option>
							<option value="文学">文学</option>
							<option value="小说">小说</option>
							<option value="历史">历史</option>
							<option value="哲学">哲学</option>
							<option value="科学">科学</option>
							<option value="技术">技术</option>
							<option value="艺术">艺术</option>
							<option value="教育">教育</option>
							<option value="经济">经济</option>
							<option value="心理学">心理学</option>
							<option value="传记">传记</option>
							<option value="旅行">旅行</option>
							<option value="美食">美食</option>
							<option value="健康">健康</option>
							<option value="商业">商业</option>
							<option value="其他">其他</option>
						</select>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="book-tags" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							标签（可选，用逗号分隔）
						</label>
						<input
							id="book-tags"
							type="text"
							value={tags}
							onChange={(e) => setTags(e.target.value)}
							placeholder="例如：科幻,经典,必读"
							disabled={uploading}
							style={{
								width: '100%',
								padding: 'var(--spacing-md) var(--spacing-lg)',
								border: '2px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
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
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="book-language" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							语言（可选）
						</label>
						<select
							id="book-language"
							value={language}
							onChange={(e) => setLanguage(e.target.value)}
							disabled={uploading}
							style={{
								width: '100%',
								padding: 'var(--spacing-md) var(--spacing-lg)',
								border: '2px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
								cursor: 'pointer',
								fontFamily: 'var(--font-family)'
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-primary)';
								e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-lighter)';
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = 'var(--color-border)';
								e.currentTarget.style.boxShadow = 'none';
							}}
						>
							<option value="">选择语言</option>
							<option value="中文">中文</option>
							<option value="英文">英文</option>
							<option value="日文">日文</option>
							<option value="法文">法文</option>
							<option value="德文">德文</option>
							<option value="其他">其他</option>
						</select>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="book-isbn" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							ISBN（可选）
						</label>
						<input
							id="book-isbn"
							type="text"
							value={isbn}
							onChange={(e) => setIsbn(e.target.value)}
							placeholder="例如：978-0-123456-78-9"
							disabled={uploading}
							style={{
								width: '100%',
								padding: 'var(--spacing-md) var(--spacing-lg)',
								border: '2px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
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
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="book-publisher" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							出版社（可选）
						</label>
						<input
							id="book-publisher"
							type="text"
							value={publisher}
							onChange={(e) => setPublisher(e.target.value)}
							placeholder="例如：人民文学出版社"
							disabled={uploading}
							style={{
								width: '100%',
								padding: 'var(--spacing-md) var(--spacing-lg)',
								border: '2px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
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
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
						<label htmlFor="book-publish-year" style={{ 
							fontSize: 'var(--font-size-sm)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							出版年份（可选）
						</label>
						<input
							id="book-publish-year"
							type="number"
							value={publishYear}
							onChange={(e) => setPublishYear(e.target.value)}
							placeholder="例如：2020"
							min="1000"
							max="3000"
							disabled={uploading}
							style={{
								width: '100%',
								padding: 'var(--spacing-md) var(--spacing-lg)',
								border: '2px solid var(--color-border)',
								borderRadius: 'var(--radius-md)',
								fontSize: 'var(--font-size-base)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
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
					</div>
				</div>
				<button
					type="submit"
					disabled={!file || uploading}
					className="btn-academic-primary"
					style={{
						padding: 'var(--spacing-md) var(--spacing-xl)',
						fontSize: 'var(--font-size-base)',
						fontWeight: 600,
						borderRadius: 'var(--radius-md)',
						opacity: (!file || uploading) ? 0.6 : 1,
						cursor: (!file || uploading) ? 'not-allowed' : 'pointer',
						transition: 'all var(--transition-fast)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 'var(--spacing-sm)',
						marginTop: 'var(--spacing-md)'
					}}
					onMouseEnter={(e) => {
						if (!(!file || uploading)) {
							e.currentTarget.style.transform = 'translateY(-2px)';
							e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
						}
					}}
					onMouseLeave={(e) => {
						if (!(!file || uploading)) {
							e.currentTarget.style.transform = 'translateY(0)';
							e.currentTarget.style.boxShadow = 'none';
						}
					}}
				>
					{uploading ? (
						<>
							<span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
							上传中...
						</>
					) : (
						<>
							<UploadIcon size={16} color="currentColor" />
							上传电子书
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
					<span>⏳</span>
					{progress}
				</div>
			)}
			{msg && (
				<div
					style={{
						marginTop: 'var(--spacing-lg)',
						padding: 'var(--spacing-md) var(--spacing-lg)',
						background: msg.includes('成功') 
							? 'linear-gradient(135deg, rgba(45, 122, 50, 0.1) 0%, rgba(45, 122, 50, 0.05) 100%)' 
							: 'linear-gradient(135deg, rgba(198, 40, 40, 0.1) 0%, rgba(198, 40, 40, 0.05) 100%)',
						color: msg.includes('成功') 
							? 'var(--color-success)' 
							: 'var(--color-error)',
						borderLeft: `4px solid ${msg.includes('成功') ? 'var(--color-success)' : 'var(--color-error)'}`,
						borderRadius: 'var(--radius-md)',
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500,
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-sm)',
						boxShadow: 'var(--shadow-sm)'
					}}
				>
					<span>{msg.includes('成功') ? '✅' : '❌'}</span>
					{msg}
				</div>
			)}
		</div>
	);
}

