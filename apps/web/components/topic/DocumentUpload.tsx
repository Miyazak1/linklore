'use client';
import { useState, useEffect } from 'react';
import DocumentTreeSelector, { DocumentNode } from './DocumentTreeSelector';

export default function DocumentUpload({ topicId }: { topicId: string }) {
	const [file, setFile] = useState<File | null>(null);
	const [msg, setMsg] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState<string>('');
	const [parentId, setParentId] = useState<string | null>(null);
	const [documents, setDocuments] = useState<DocumentNode[]>([]);
	const [loadingDocs, setLoadingDocs] = useState(true);

	// 加载文档树
	useEffect(() => {
		async function loadDocuments() {
			try {
				const res = await fetch(`/api/topics/${topicId}/documents/tree`);
				if (res.ok) {
					const data = await res.json();
					setDocuments(data.documents || []);
				}
			} catch (err) {
				console.error('Failed to load documents:', err);
			} finally {
				setLoadingDocs(false);
			}
		}
		loadDocuments();
	}, [topicId]);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMsg(null);
		setProgress('');
		if (!file) return;

		setUploading(true);
		try {
			setProgress('初始化上传...');
			const initRes = await fetch('/api/uploads/initiate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filename: file.name, size: file.size, topicId })
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

			setProgress('创建文档中...');
			const doneRes = await fetch('/api/uploads/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					key: init.key, 
					mime: init.contentType, 
					size: file.size, 
					topicId,
					parentId: parentId || undefined
				})
			});
			const done = await doneRes.json();
			if (!doneRes.ok) {
				setMsg(done.error || '完成失败');
				setUploading(false);
				return;
			}

			setProgress('上传成功！正在刷新...');
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
			marginBottom: 'var(--spacing-xl)',
			padding: 'var(--spacing-lg)',
			borderLeftColor: 'var(--color-primary)'
		}}>
			<h3 style={{ 
				marginTop: 0, 
				marginBottom: 'var(--spacing-sm)',
				fontSize: 'var(--font-size-lg)',
				color: 'var(--color-primary)'
			}}>上传回应文档</h3>
			<p style={{ 
				fontSize: 'var(--font-size-sm)', 
				color: 'var(--color-text-secondary)', 
				marginBottom: 'var(--spacing-md)',
				lineHeight: 'var(--line-height-relaxed)'
			}}>
				上传新文档来回应这个话题。支持：doc, docx, txt, md, pdf, rtf（单文件 ≤ 20MB）
			</p>
			{!loadingDocs && documents.length > 0 && (
				<div style={{ marginBottom: 'var(--spacing-md)' }}>
					<DocumentTreeSelector
						topicId={topicId}
						documents={documents}
						selectedParentId={parentId}
						onSelect={setParentId}
					/>
				</div>
			)}
			{loadingDocs && (
				<div style={{ 
					marginBottom: 'var(--spacing-md)',
					padding: 'var(--spacing-md)',
					textAlign: 'center',
					color: 'var(--color-text-secondary)',
					fontSize: 'var(--font-size-sm)'
				}}>
					加载文档列表...
				</div>
			)}
			<form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
				<input
					type="file"
					onChange={(e) => setFile(e.target.files?.[0] || null)}
					disabled={uploading}
					accept=".doc,.docx,.txt,.md,.pdf,.rtf"
					style={{
						width: '100%',
						padding: 'var(--spacing-md)',
						border: '1px solid var(--color-border)',
						borderRadius: 'var(--radius-md)',
						fontSize: 'var(--font-size-base)',
						background: 'var(--color-background-paper)',
						cursor: uploading ? 'not-allowed' : 'pointer',
						transition: 'all var(--transition-fast)'
					}}
					onFocus={(e) => {
						if (!uploading) {
							e.currentTarget.style.borderColor = 'var(--color-primary)';
							e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-lighter)';
						}
					}}
					onBlur={(e) => {
						e.currentTarget.style.borderColor = 'var(--color-border)';
						e.currentTarget.style.boxShadow = 'none';
					}}
				/>
				<button
					type="submit"
					disabled={!file || uploading}
					className="btn-academic-primary"
					style={{
						padding: 'var(--spacing-md) var(--spacing-lg)',
						fontSize: 'var(--font-size-base)',
						fontWeight: 600,
						opacity: (!file || uploading) ? 0.6 : 1,
						cursor: (!file || uploading) ? 'not-allowed' : 'pointer'
					}}
				>
					{uploading ? '上传中...' : '上传文档'}
				</button>
			</form>
			{progress && (
				<div style={{ 
					marginTop: 'var(--spacing-md)',
					padding: 'var(--spacing-md)',
					background: 'var(--color-primary-lighter)',
					borderLeft: '4px solid var(--color-primary)',
					borderRadius: 'var(--radius-sm)',
					color: 'var(--color-primary-dark)',
					fontWeight: 500,
					fontSize: 'var(--font-size-sm)'
				}}>
					{progress}
				</div>
			)}
			{msg && (
				<div
					style={{
						marginTop: 'var(--spacing-md)',
						padding: 'var(--spacing-md)',
						background: msg.includes('成功') ? 'rgba(45, 122, 50, 0.1)' : 'rgba(198, 40, 40, 0.1)',
						color: msg.includes('成功') ? 'var(--color-success)' : 'var(--color-error)',
						borderLeft: `4px solid ${msg.includes('成功') ? 'var(--color-success)' : 'var(--color-error)'}`,
						borderRadius: 'var(--radius-sm)',
						fontSize: 'var(--font-size-sm)',
						fontWeight: 500
					}}
				>
					{msg}
				</div>
			)}
		</div>
	);
}

