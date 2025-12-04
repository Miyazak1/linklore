'use client';
import { useState } from 'react';
import ResponseTemplate from '@/components/editor/ResponseTemplate';
import LazyTopicList from '@/components/lazy/LazyTopicList';
import TopicSearch from '@/components/topic/TopicSearch';

export default function UploadPage() {
	const [file, setFile] = useState<File | null>(null);
	const [title, setTitle] = useState<string>('');
	const [msg, setMsg] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState<string>('');
	
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
			{/* 页面标题 */}
			<div style={{ 
				marginBottom: 'var(--spacing-xxl)',
				paddingBottom: 'var(--spacing-xl)',
				borderBottom: '2px solid var(--color-border-light)',
				textAlign: 'center'
			}}>
				<h1 style={{ 
					marginTop: 0,
					marginBottom: 'var(--spacing-md)',
					fontSize: 'clamp(2rem, 5vw, 3rem)',
					fontWeight: 700,
					background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
					backgroundClip: 'text',
					letterSpacing: '-0.02em'
				}}>文章</h1>
				<p style={{ 
					color: 'var(--color-text-secondary)',
					fontSize: 'var(--font-size-lg)',
					lineHeight: 'var(--line-height-relaxed)',
					margin: 0,
					maxWidth: '600px',
					marginLeft: 'auto',
					marginRight: 'auto'
				}}>
					通过多角度、多层次的严肃讨论，分析不同观点，识别共识与分歧，逐步接近事实真相
				</p>
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
						fontSize: '24px',
						flexShrink: 0
					}}>
						📝
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
							<span>✨</span> AI 将根据文档内容生成副标题（异步处理）
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
								<div style={{
									fontSize: '48px',
									lineHeight: 1
								}}>📄</div>
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
								<span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
								上传中...
							</>
						) : (
							<>
								<span>🚀</span>
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
						<span>⏳</span>
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
						<span>{msg.includes('成功') ? '✅' : '❌'}</span>
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
						fontSize: '20px',
						flexShrink: 0
					}}>
						📚
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


