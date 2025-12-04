'use client';
import { useState } from 'react';

export default function BookUpload() {
	const [file, setFile] = useState<File | null>(null);
	const [title, setTitle] = useState('');
	const [author, setAuthor] = useState('');
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
						source: 'manual'
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
					author: author.trim() || undefined
				})
			});
			const done = await doneRes.json();
			if (!doneRes.ok) {
				setMsg(done.error || '完成失败');
				setUploading(false);
				return;
			}

			setProgress('上传成功！正在刷新...');
			setFile(null);
			setTitle('');
			setAuthor('');
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
					fontSize: '24px',
					flexShrink: 0
				}}>
					📤
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
								fontSize: '48px',
								lineHeight: 1
							}}>📚</div>
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
							<span>📤</span>
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

