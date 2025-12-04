'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TopicSearch() {
	const [query, setQuery] = useState('');
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<any[]>([]);
	const [showResults, setShowResults] = useState(false);
	const router = useRouter();

	const onSearch = async () => {
		if (!query.trim()) {
			setResults([]);
			setShowResults(false);
			return;
		}

		setSearching(true);
		try {
			const res = await fetch(`/api/topics/search?q=${encodeURIComponent(query)}`);
			const data = await res.json();
			if (res.ok) {
				setResults(data.items || []);
				setShowResults(true);
			}
		} catch (err: any) {
			console.error('Search error:', err);
		} finally {
			setSearching(false);
		}
	};

	const onSelectTopic = (topicId: string) => {
		router.push(`/topics/${topicId}`);
		setShowResults(false);
		setQuery('');
	};

	const [isFocused, setIsFocused] = useState(false);

	return (
		<div style={{ position: 'relative', marginBottom: 'var(--spacing-xxl)' }}>
			<div style={{ 
				display: 'flex', 
				gap: 'var(--spacing-sm)',
				background: 'var(--color-background-paper)',
				borderRadius: 'var(--radius-lg)',
				padding: 'var(--spacing-xs)',
				boxShadow: isFocused ? '0 0 0 4px var(--color-primary-lighter), var(--shadow-lg)' : 'var(--shadow-md)',
				border: `1px solid ${isFocused ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
				transition: 'all var(--transition-fast)'
			}}
			>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-sm)',
					flex: 1,
					padding: '0 var(--spacing-md)'
				}}>
					<span style={{ fontSize: '20px', opacity: 0.6 }}>🔍</span>
					<input
						type="text"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							if (e.target.value.trim()) {
								onSearch();
							} else {
								setResults([]);
								setShowResults(false);
							}
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								onSearch();
							}
						}}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
						placeholder="搜索话题标题、作者或内容..."
						style={{
							flex: 1,
							padding: 'var(--spacing-md) 0',
							fontSize: 'var(--font-size-base)',
							border: 'none',
							outline: 'none',
							background: 'transparent',
							color: 'var(--color-text-primary)',
							fontFamily: 'var(--font-family)'
						}}
					/>
				</div>
				<button
					type="button"
					onClick={onSearch}
					disabled={searching}
					style={{
						padding: 'var(--spacing-md) var(--spacing-xl)',
						background: 'var(--color-primary)',
						color: '#fff',
						border: 'none',
						borderRadius: 'var(--radius-md)',
						cursor: searching ? 'wait' : 'pointer',
						fontSize: 'var(--font-size-base)',
						fontWeight: 600,
						transition: 'all var(--transition-fast)',
						opacity: searching ? 0.7 : 1,
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-xs)',
						whiteSpace: 'nowrap'
					}}
					onMouseEnter={(e) => {
						if (!searching) {
							e.currentTarget.style.background = 'var(--color-primary-dark)';
							e.currentTarget.style.transform = 'translateY(-1px)';
							e.currentTarget.style.boxShadow = 'var(--shadow-md)';
						}
					}}
					onMouseLeave={(e) => {
						if (!searching) {
							e.currentTarget.style.background = 'var(--color-primary)';
							e.currentTarget.style.transform = 'translateY(0)';
							e.currentTarget.style.boxShadow = 'none';
						}
					}}
				>
					{searching ? (
						<>
							<span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
							搜索中...
						</>
					) : (
						<>
							<span>🔍</span>
							搜索
						</>
					)}
				</button>
			</div>

			{showResults && results.length > 0 && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						right: 0,
						background: 'var(--color-background-paper)',
						border: '1px solid var(--color-border)',
						borderRadius: 'var(--radius-md)',
						boxShadow: 'var(--shadow-lg)',
						zIndex: 1000,
						maxHeight: '400px',
						overflowY: 'auto',
						marginTop: 'var(--spacing-xs)'
					}}
				>
					{results.map((topic) => (
						<div
							key={topic.id}
							onClick={() => onSelectTopic(topic.id)}
							style={{
								padding: 'var(--spacing-md)',
								borderBottom: '1px solid var(--color-border-light)',
								cursor: 'pointer',
								transition: 'all var(--transition-fast)'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'var(--color-background-subtle)';
								e.currentTarget.style.borderLeftColor = 'var(--color-primary)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'var(--color-background-paper)';
								e.currentTarget.style.borderLeftColor = 'transparent';
							}}
						>
							<div style={{ 
								fontWeight: 600, 
								marginBottom: 'var(--spacing-xs)',
								color: 'var(--color-text-primary)',
								fontSize: 'var(--font-size-base)'
							}}>{topic.title}</div>
							<div style={{ 
								fontSize: 'var(--font-size-sm)', 
								color: 'var(--color-text-secondary)'
							}}>
								作者：{topic.author?.email || '未知'} · 文档数：{topic._count?.documents || 0} ·{' '}
								{new Date(topic.createdAt).toLocaleDateString('zh-CN')}
							</div>
						</div>
					))}
				</div>
			)}

			{showResults && results.length === 0 && query.trim() && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						right: 0,
						background: 'var(--color-background-paper)',
						border: '1px solid var(--color-border)',
						borderRadius: 'var(--radius-md)',
						boxShadow: 'var(--shadow-lg)',
						zIndex: 1000,
						padding: 'var(--spacing-xl)',
						textAlign: 'center',
						color: 'var(--color-text-secondary)',
						marginTop: 'var(--spacing-xs)',
						fontSize: 'var(--font-size-base)'
					}}
				>
					未找到相关话题
				</div>
			)}
		</div>
	);
}

