'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

export interface CitationData {
	id?: string;
	url?: string;
	title: string;
	author?: string;
	publisher?: string;
	year?: number;
	type: 'web' | 'book' | 'paper' | 'journal' | 'other';
	quote?: string;
	page?: string;
	order?: number;
}

interface Props {
	citations: CitationData[];
	onChange: (citations: CitationData[]) => void;
	onInsert?: (citation: CitationData, index: number) => void;
	hoveredCitationId?: string | null;
}

const typeLabels: Record<string, string> = {
	web: '网页',
	book: '书籍',
	paper: '论文',
	journal: '期刊',
	other: '其他'
};

export default function CitationManager({ citations, onChange, onInsert, hoveredCitationId }: Props) {
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [formData, setFormData] = useState<CitationData>({
		title: '',
		type: 'web',
		url: '',
		author: '',
		publisher: '',
		year: undefined,
		quote: '',
		page: ''
	});

	const handleAdd = () => {
		const newCitation: CitationData = {
			...formData,
			order: citations.length + 1
		};
		onChange([...citations, newCitation]);
		setFormData({
			title: '',
			type: 'web',
			url: '',
			author: '',
			publisher: '',
			year: undefined,
			quote: '',
			page: ''
		});
	};

	const handleEdit = (index: number) => {
		setEditingIndex(index);
		setFormData(citations[index]);
	};

	const handleSave = () => {
		if (editingIndex !== null) {
			const updated = [...citations];
			updated[editingIndex] = { ...formData, order: editingIndex + 1 };
			onChange(updated);
			setEditingIndex(null);
			setFormData({
				title: '',
				type: 'web',
				url: '',
				author: '',
				publisher: '',
				year: undefined,
				quote: '',
				page: ''
			});
		}
	};

	const handleDelete = (index: number) => {
		if (confirm('确定要删除此引用吗？')) {
			const updated = citations.filter((_, i) => i !== index);
			// 重新编号
			updated.forEach((c, i) => {
				c.order = i + 1;
			});
			onChange(updated);
		}
	};

	const handleCancel = () => {
		setEditingIndex(null);
		setFormData({
			title: '',
			type: 'web',
			url: '',
			author: '',
			publisher: '',
			year: undefined,
			quote: '',
			page: ''
		});
	};

	const validateUrl = (url: string): string | null => {
		if (!url || url.trim() === '') return null;
		try {
			const parsed = new URL(url);
			if (!['http:', 'https:'].includes(parsed.protocol)) {
				return '只支持HTTP/HTTPS协议';
			}
			if (/^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(parsed.hostname)) {
				return '不允许内网地址';
			}
			if (parsed.hostname === 'localhost' || parsed.hostname === '0.0.0.0') {
				return '不允许localhost';
			}
			return null;
		} catch {
			return '无效的URL格式';
		}
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
			<h3 style={{ fontSize: 'var(--font-size-base)', margin: 0 }}>引用管理</h3>

			{/* 引用表单 */}
			<div
				style={{
					padding: 'var(--spacing-md)',
					border: '1px solid var(--color-border)',
					borderRadius: 'var(--radius-md)',
					background: 'var(--color-background-subtle)'
				}}
			>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
					<div>
						<label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
							标题 <span style={{ color: 'var(--color-error)' }}>*</span>
						</label>
						<input
							type="text"
							value={formData.title}
							onChange={(e) => setFormData({ ...formData, title: e.target.value })}
							placeholder="引用标题"
							style={{
								width: '100%',
								padding: '6px 8px',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-sm)',
								fontSize: 'var(--font-size-sm)'
							}}
						/>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
						<div>
							<label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
								类型
							</label>
							<select
								value={formData.type}
								onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
								style={{
									width: '100%',
									padding: '6px 8px',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-sm)',
									fontSize: 'var(--font-size-sm)'
								}}
							>
								{Object.entries(typeLabels).map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</select>
						</div>

						<div>
							<label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
								URL
							</label>
							<input
								type="url"
								value={formData.url || ''}
								onChange={(e) => {
									const url = e.target.value;
									setFormData({ ...formData, url });
									const error = validateUrl(url);
									if (error && url) {
										// 可以显示错误提示
									}
								}}
								placeholder="https://..."
								style={{
									width: '100%',
									padding: '6px 8px',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-sm)',
									fontSize: 'var(--font-size-sm)'
								}}
							/>
						</div>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
						<div>
							<label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
								作者
							</label>
							<input
								type="text"
								value={formData.author || ''}
								onChange={(e) => setFormData({ ...formData, author: e.target.value })}
								placeholder="作者姓名"
								style={{
									width: '100%',
									padding: '6px 8px',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-sm)',
									fontSize: 'var(--font-size-sm)'
								}}
							/>
						</div>

						<div>
							<label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
								年份
							</label>
							<input
								type="number"
								value={formData.year || ''}
								onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : undefined })}
								placeholder="2024"
								min="1000"
								max="2100"
								style={{
									width: '100%',
									padding: '6px 8px',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-sm)',
									fontSize: 'var(--font-size-sm)'
								}}
							/>
						</div>
					</div>

					<div>
						<label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
							出版机构
						</label>
						<input
							type="text"
							value={formData.publisher || ''}
							onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
							placeholder="出版机构"
							style={{
								width: '100%',
								padding: '6px 8px',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-sm)',
								fontSize: 'var(--font-size-sm)'
							}}
						/>
					</div>

					<div>
						<label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
							引用片段
						</label>
						<textarea
							value={formData.quote || ''}
							onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
							placeholder="引用片段（可选）"
							rows={3}
							style={{
								width: '100%',
								padding: '6px 8px',
								border: '1px solid var(--color-border)',
								borderRadius: 'var(--radius-sm)',
								fontSize: 'var(--font-size-sm)',
								resize: 'vertical'
							}}
						/>
					</div>

					<div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
						{editingIndex === null ? (
							<Button variant="primary" size="sm" onClick={handleAdd} disabled={!formData.title.trim()}>
								添加引用
							</Button>
						) : (
							<>
								<Button variant="primary" size="sm" onClick={handleSave}>
									保存
								</Button>
								<Button variant="secondary" size="sm" onClick={handleCancel}>
									取消
								</Button>
							</>
						)}
					</div>
				</div>
			</div>

			{/* 引用列表 */}
			{citations.length > 0 && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
					<h4 style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>已添加的引用 ({citations.length})</h4>
					{citations.map((citation, index) => {
						const citationId = citation.id || `temp-${index}`;
						const isHovered = hoveredCitationId === citationId;
						return (
							<div
								id={`citation-item-${citationId}`}
								key={index}
								style={{
									padding: 'var(--spacing-sm)',
									border: '1px solid var(--color-border)',
									borderRadius: 'var(--radius-md)',
									background: isHovered
										? 'rgba(33, 150, 243, 0.08)'
										: 'var(--color-background-paper)',
									borderColor: isHovered
										? 'rgba(33, 150, 243, 0.3)'
										: 'var(--color-border)',
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'start',
									gap: 'var(--spacing-sm)',
									transition: 'all var(--transition-fast)',
									boxShadow: isHovered
										? '0 2px 4px rgba(33, 150, 243, 0.1)'
										: 'none'
								}}
							>
							<div style={{ flex: 1 }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
									<span
										style={{
											display: 'inline-flex',
											alignItems: 'center',
											justifyContent: 'center',
											width: '20px',
											height: '20px',
											borderRadius: '50%',
											background: 'var(--color-primary)',
											color: '#fff',
											fontSize: 'var(--font-size-xs)',
											fontWeight: 600
										}}
									>
										{citation.order || index + 1}
									</span>
									<span style={{ fontWeight: 500 }}>{citation.title}</span>
									<span
										style={{
											padding: '2px 6px',
											borderRadius: 'var(--radius-sm)',
											fontSize: 'var(--font-size-xs)',
											background: 'var(--color-background-subtle)',
											color: 'var(--color-text-secondary)'
										}}
									>
										{typeLabels[citation.type] || citation.type}
									</span>
								</div>
								<div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
									{citation.author && <span>{citation.author}</span>}
									{citation.year && <span> ({citation.year})</span>}
									{citation.publisher && <span> - {citation.publisher}</span>}
								</div>
							</div>
							<div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
								<Button variant="secondary" size="sm" onClick={() => handleEdit(index)}>
									编辑
								</Button>
								<Button variant="error" size="sm" onClick={() => handleDelete(index)}>
									删除
								</Button>
								{onInsert && (
									<Button
										variant="primary"
										size="sm"
										onClick={() => onInsert(citation, index)}
										title="在正文编辑器中选中文本后，点击此按钮可在选中文本后插入引用标记"
									>
										插入引用
									</Button>
								)}
							</div>
						</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

