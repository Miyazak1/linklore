'use client';
import { useState, useEffect, useRef } from 'react';
import { FilterIcon, SearchIcon } from '@/components/ui/Icons';

interface FilterOptions {
	search?: string;
	category?: string;
	tag?: string;
	language?: string;
	author?: string;
	hasAssets?: boolean;
	sort?: 'latest' | 'title' | 'author';
}

interface BookFilterBarProps {
	filters: FilterOptions;
	onFiltersChange: (filters: FilterOptions) => void;
	availableCategories: string[];
	availableTags: string[];
}

const COMMON_CATEGORIES = [
	'文学', '小说', '历史', '哲学', '科学', '技术', '艺术', '教育',
	'经济', '心理学', '传记', '旅行', '美食', '健康', '商业', '其他'
];

const COMMON_LANGUAGES = ['中文', '英文', '日文', '法文', '德文', '其他'];

export default function BookFilterBar({
	filters,
	onFiltersChange,
	availableCategories,
	availableTags,
}: BookFilterBarProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
	const [searchInput, setSearchInput] = useState(filters.search || '');
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		setLocalFilters(filters);
		setSearchInput(filters.search || '');
	}, [filters]);

	// 搜索输入改变时的处理（带防抖）
	const handleSearchInputChange = (value: string) => {
		setSearchInput(value);
		
		// 清除之前的定时器
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}
		
		// 设置新的防抖定时器（500ms后触发搜索）
		searchTimeoutRef.current = setTimeout(() => {
			const newFilters = { ...localFilters, search: value.trim() || undefined };
			setLocalFilters(newFilters);
			onFiltersChange(newFilters);
		}, 500);
	};

	// 手动触发搜索（点击搜索按钮或按Enter）
	const handleSearch = () => {
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}
		const searchValue = searchInput.trim();
		const newFilters = { 
			...localFilters, 
			search: searchValue || undefined,
			sort: localFilters.sort || 'latest'
		};
		console.log('[BookFilterBar] 搜索:', searchValue, '新筛选条件:', newFilters);
		setLocalFilters(newFilters);
		onFiltersChange(newFilters);
	};

	const handleFilterChange = (key: keyof FilterOptions, value: any) => {
		const newFilters = { ...localFilters, [key]: value || undefined };
		setLocalFilters(newFilters);
		onFiltersChange(newFilters);
	};

	const handleClearFilters = () => {
		const cleared = { sort: 'latest' };
		setLocalFilters(cleared);
		setSearchInput('');
		onFiltersChange(cleared);
	};

	const hasActiveFilters = Boolean(
		localFilters.search ||
		localFilters.category ||
		localFilters.tag ||
		localFilters.language ||
		localFilters.author ||
		localFilters.hasAssets !== undefined ||
		(localFilters.sort && localFilters.sort !== 'latest')
	);

	return (
		<div className="card-academic" style={{
			marginBottom: 'var(--spacing-xl)',
			padding: 'var(--spacing-lg)',
			background: 'var(--color-background-paper)',
			borderRadius: 'var(--radius-lg)',
			boxShadow: 'var(--shadow-sm)',
			border: '1px solid var(--color-border-light)'
		}}>
			{/* 搜索栏 */}
			<div style={{ 
				marginBottom: 'var(--spacing-md)',
				display: 'flex',
				gap: 'var(--spacing-sm)'
			}}>
				<input
					type="text"
					value={searchInput}
					onChange={(e) => handleSearchInputChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							handleSearch();
						}
					}}
					placeholder="搜索书名、作者、简介..."
					style={{
						flex: 1,
						padding: 'var(--spacing-md)',
						fontSize: 'var(--font-size-base)',
						border: '1px solid var(--color-border-light)',
						borderRadius: 'var(--radius-md)',
						background: 'var(--color-background)',
						color: 'var(--color-text-primary)',
						outline: 'none',
						transition: 'border-color var(--transition-fast)'
					}}
					onFocus={(e) => {
						e.currentTarget.style.borderColor = 'var(--color-primary)';
					}}
					onBlur={(e) => {
						e.currentTarget.style.borderColor = 'var(--color-border-light)';
					}}
				/>
				<button
					type="button"
					onClick={handleSearch}
					className="btn-academic-primary"
					style={{
						padding: 'var(--spacing-md) var(--spacing-lg)',
						fontSize: 'var(--font-size-base)',
						fontWeight: 600,
						borderRadius: 'var(--radius-md)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 'var(--spacing-xs)',
						whiteSpace: 'nowrap',
						transition: 'all var(--transition-fast)',
						minWidth: '100px'
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.transform = 'translateY(-1px)';
						e.currentTarget.style.boxShadow = 'var(--shadow-md)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.transform = 'translateY(0)';
						e.currentTarget.style.boxShadow = 'none';
					}}
				>
					<SearchIcon size={16} color="currentColor" />
					搜索
				</button>
			</div>

			{/* 展开/收起按钮和活动筛选计数 */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				marginBottom: isExpanded ? 'var(--spacing-md)' : 0
			}}>
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-xs)',
						padding: 'var(--spacing-sm) var(--spacing-md)',
						background: 'transparent',
						border: '1px solid var(--color-border-light)',
						borderRadius: 'var(--radius-md)',
						color: 'var(--color-text-primary)',
						cursor: 'pointer',
						fontSize: 'var(--font-size-sm)',
						transition: 'all var(--transition-fast)'
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.borderColor = 'var(--color-primary)';
						e.currentTarget.style.color = 'var(--color-primary)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.borderColor = 'var(--color-border-light)';
						e.currentTarget.style.color = 'var(--color-text-primary)';
					}}
				>
					<FilterIcon size={16} color="currentColor" />
					{isExpanded ? '收起筛选' : '展开筛选'}
					{hasActiveFilters && (
						<span style={{
							marginLeft: 'var(--spacing-xs)',
							padding: '2px 6px',
							background: 'var(--color-primary)',
							color: 'white',
							borderRadius: '10px',
							fontSize: 'var(--font-size-xs)'
						}}>
							●
						</span>
					)}
				</button>
				{hasActiveFilters && (
					<button
						type="button"
						onClick={handleClearFilters}
						style={{
							padding: 'var(--spacing-sm) var(--spacing-md)',
							background: 'transparent',
							border: '1px solid var(--color-border-light)',
							borderRadius: 'var(--radius-md)',
							color: 'var(--color-text-secondary)',
							cursor: 'pointer',
							fontSize: 'var(--font-size-sm)',
							transition: 'all var(--transition-fast)'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-error)';
							e.currentTarget.style.color = 'var(--color-error)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.borderColor = 'var(--color-border-light)';
							e.currentTarget.style.color = 'var(--color-text-secondary)';
						}}
					>
						清除筛选
					</button>
				)}
			</div>

			{/* 筛选选项（可展开） */}
			{isExpanded && (
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
					gap: 'var(--spacing-md)',
					paddingTop: 'var(--spacing-md)',
					borderTop: '1px solid var(--color-border-light)'
				}}>
					{/* 分类 */}
					<div>
						<label style={{
							display: 'block',
							marginBottom: 'var(--spacing-xs)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500,
							color: 'var(--color-text-primary)'
						}}>
							分类
						</label>
						<select
							value={localFilters.category || ''}
							onChange={(e) => handleFilterChange('category', e.target.value)}
							style={{
								width: '100%',
								padding: 'var(--spacing-sm)',
								fontSize: 'var(--font-size-sm)',
								border: '1px solid var(--color-border-light)',
								borderRadius: 'var(--radius-md)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
								cursor: 'pointer'
							}}
						>
							<option value="">全部</option>
							{COMMON_CATEGORIES.map(cat => (
								<option key={cat} value={cat}>{cat}</option>
							))}
							{availableCategories.filter(cat => !COMMON_CATEGORIES.includes(cat)).map(cat => (
								<option key={cat} value={cat}>{cat}</option>
							))}
						</select>
					</div>

					{/* 标签 */}
					<div>
						<label style={{
							display: 'block',
							marginBottom: 'var(--spacing-xs)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500,
							color: 'var(--color-text-primary)'
						}}>
							标签
						</label>
						<select
							value={localFilters.tag || ''}
							onChange={(e) => handleFilterChange('tag', e.target.value)}
							style={{
								width: '100%',
								padding: 'var(--spacing-sm)',
								fontSize: 'var(--font-size-sm)',
								border: '1px solid var(--color-border-light)',
								borderRadius: 'var(--radius-md)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
								cursor: 'pointer'
							}}
						>
							<option value="">全部</option>
							{availableTags.map(tag => (
								<option key={tag} value={tag}>{tag}</option>
							))}
						</select>
					</div>

					{/* 语言 */}
					<div>
						<label style={{
							display: 'block',
							marginBottom: 'var(--spacing-xs)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500,
							color: 'var(--color-text-primary)'
						}}>
							语言
						</label>
						<select
							value={localFilters.language || ''}
							onChange={(e) => handleFilterChange('language', e.target.value)}
							style={{
								width: '100%',
								padding: 'var(--spacing-sm)',
								fontSize: 'var(--font-size-sm)',
								border: '1px solid var(--color-border-light)',
								borderRadius: 'var(--radius-md)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
								cursor: 'pointer'
							}}
						>
							<option value="">全部</option>
							{COMMON_LANGUAGES.map(lang => (
								<option key={lang} value={lang}>{lang}</option>
							))}
						</select>
					</div>

					{/* 排序 */}
					<div>
						<label style={{
							display: 'block',
							marginBottom: 'var(--spacing-xs)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500,
							color: 'var(--color-text-primary)'
						}}>
							排序
						</label>
						<select
							value={localFilters.sort || 'latest'}
							onChange={(e) => handleFilterChange('sort', e.target.value)}
							style={{
								width: '100%',
								padding: 'var(--spacing-sm)',
								fontSize: 'var(--font-size-sm)',
								border: '1px solid var(--color-border-light)',
								borderRadius: 'var(--radius-md)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
								cursor: 'pointer'
							}}
						>
							<option value="latest">最新添加</option>
							<option value="title">按标题</option>
							<option value="author">按作者</option>
						</select>
					</div>

					{/* 是否有电子书 */}
					<div>
						<label style={{
							display: 'block',
							marginBottom: 'var(--spacing-xs)',
							fontSize: 'var(--font-size-sm)',
							fontWeight: 500,
							color: 'var(--color-text-primary)'
						}}>
							文件类型
						</label>
						<select
							value={localFilters.hasAssets === undefined ? '' : localFilters.hasAssets ? 'yes' : 'no'}
							onChange={(e) => {
								if (e.target.value === '') {
									handleFilterChange('hasAssets', undefined);
								} else {
									handleFilterChange('hasAssets', e.target.value === 'yes');
								}
							}}
							style={{
								width: '100%',
								padding: 'var(--spacing-sm)',
								fontSize: 'var(--font-size-sm)',
								border: '1px solid var(--color-border-light)',
								borderRadius: 'var(--radius-md)',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
								cursor: 'pointer'
							}}
						>
							<option value="">全部</option>
							<option value="yes">有电子书</option>
							<option value="no">无电子书</option>
						</select>
					</div>
				</div>
			)}
		</div>
	);
}

