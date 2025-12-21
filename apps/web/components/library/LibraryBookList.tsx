'use client';
import { useState, useEffect, useCallback } from 'react';
import { LibraryIcon } from '@/components/ui/Icons';
import BookList from './BookList';
import BookFilterBar from './BookFilterBar';

interface FilterOptions {
	search?: string;
	category?: string;
	tag?: string;
	language?: string;
	author?: string;
	hasAssets?: boolean;
	sort?: 'latest' | 'title' | 'author';
}

type Book = {
	id: string;
	title: string;
	author: string | null;
	coverUrl: string | null;
	overview: string | null;
	createdAt: string;
	assets?: Array<{ id: string; fileKey: string; mime: string }>;
	uploaderName?: string | null;
	category?: string | null;
	tags?: string[];
	language?: string | null;
};

interface LibraryBookListProps {
	initialBooks: Book[];
	initialCategories: string[];
	initialTags: string[];
}

export default function LibraryBookList({
	initialBooks,
	initialCategories,
	initialTags,
}: LibraryBookListProps) {
	const [books, setBooks] = useState<Book[]>(initialBooks);
	const [loading, setLoading] = useState(false);
	const [filters, setFilters] = useState<FilterOptions>({ sort: 'latest' });
	const [categories, setCategories] = useState<string[]>(initialCategories);
	const [tags, setTags] = useState<string[]>(initialTags);
	const [pagination, setPagination] = useState({
		page: 1,
		total: initialBooks.length,
		totalPages: 1,
		hasNext: false,
		hasPrev: false,
	});

	// 检查是否有任何筛选条件（除了默认排序）
	const hasActiveFilters = Boolean(
		(filters.search && filters.search.trim()) ||
		filters.category ||
		filters.tag ||
		filters.language ||
		filters.author ||
		filters.hasAssets !== undefined ||
		(filters.sort && filters.sort !== 'latest')
	);

	// 从API加载书籍（仅在需要时调用）
	const loadBooks = useCallback(async (filterOptions: FilterOptions, page: number = 1) => {
		// 如果没有筛选条件，使用初始数据
		const hasFilters = Boolean(
			(filterOptions.search && filterOptions.search.trim()) ||
			filterOptions.category ||
			filterOptions.tag ||
			filterOptions.language ||
			filterOptions.author ||
			filterOptions.hasAssets !== undefined ||
			(filterOptions.sort && filterOptions.sort !== 'latest')
		);

		console.log('[LibraryBookList] loadBooks 调用, hasFilters:', hasFilters, 'filterOptions:', filterOptions);

		if (!hasFilters) {
			// 没有筛选条件，显示所有书籍（使用initialBooks）
			setBooks(initialBooks);
			setPagination({
				page: 1,
				total: initialBooks.length,
				totalPages: 1,
				hasNext: false,
				hasPrev: false,
			});
			setLoading(false);
			return;
		}

		// 有筛选条件，调用API
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (filterOptions.search && filterOptions.search.trim()) {
				params.set('search', filterOptions.search.trim());
			}
			if (filterOptions.category) params.set('category', filterOptions.category);
			if (filterOptions.tag) params.set('tag', filterOptions.tag);
			if (filterOptions.language) params.set('language', filterOptions.language);
			if (filterOptions.author) params.set('author', filterOptions.author);
			if (filterOptions.hasAssets !== undefined) params.set('hasAssets', String(filterOptions.hasAssets));
			if (filterOptions.sort) params.set('sort', filterOptions.sort);
			params.set('page', String(page));
			params.set('limit', '50');

			const url = `/api/books/list?${params.toString()}`;
			console.log('[LibraryBookList] 调用API:', url, '筛选条件:', filterOptions);
			const res = await fetch(url);
			const data = await res.json();
			console.log('[LibraryBookList] API返回:', data.books?.length || 0, '本书', data.books);

			if (res.ok) {
				const resultBooks = data.books || [];
				console.log('[LibraryBookList] 设置书籍列表:', resultBooks.length, '本书');
				setBooks(resultBooks);
				setPagination(data.pagination || {
					page: 1,
					total: resultBooks.length,
					totalPages: 1,
					hasNext: false,
					hasPrev: false,
				});
				if (data.filters) {
					if (data.filters.categories) setCategories(data.filters.categories);
					if (data.filters.tags) setTags(data.filters.tags);
				}
			} else {
				console.error('[LibraryBookList] API错误:', data);
				setBooks([]);
				setPagination({
					page: 1,
					total: 0,
					totalPages: 1,
					hasNext: false,
					hasPrev: false,
				});
			}
		} catch (error) {
			console.error('[LibraryBookList] 加载书籍失败:', error);
			setBooks([]);
		} finally {
			setLoading(false);
		}
	}, [initialBooks]);

	// 当筛选条件改变时重新加载
	useEffect(() => {
		loadBooks(filters, 1);
	}, [filters, loadBooks]);

	const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
		setFilters(newFilters);
	}, []);

	// 转换createdAt为Date对象以兼容BookList组件
	const booksWithDate = books.map(book => ({
		...book,
		createdAt: new Date(book.createdAt),
	}));

	return (
		<div>
			{/* 筛选栏 */}
			<BookFilterBar
				filters={filters}
				onFiltersChange={handleFiltersChange}
				availableCategories={categories}
				availableTags={tags}
			/>

			{/* 标题和统计 */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				marginBottom: 'var(--spacing-xl)',
				paddingBottom: 'var(--spacing-lg)',
				borderBottom: '2px solid var(--color-border-light)'
			}}>
				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: 'var(--spacing-md)'
				}}>
					<div style={{
						width: '40px',
						height: '40px',
						borderRadius: 'var(--radius-md)',
						background: 'var(--color-secondary-lighter)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0
					}}>
						<LibraryIcon size={20} color="var(--color-secondary)" />
					</div>
					<div>
						<h2 style={{
							margin: 0,
							fontSize: 'var(--font-size-2xl)',
							fontWeight: 600,
							color: 'var(--color-text-primary)'
						}}>
							所有书籍
						</h2>
						{pagination.total > 0 && (
							<p style={{
								margin: 'var(--spacing-xs) 0 0 0',
								fontSize: 'var(--font-size-sm)',
								color: 'var(--color-text-secondary)'
							}}>
								共 {pagination.total} 本
							</p>
						)}
					</div>
				</div>
				{loading && (
					<div style={{
						fontSize: 'var(--font-size-sm)',
						color: 'var(--color-text-secondary)'
					}}>
						加载中...
					</div>
				)}
			</div>

			{/* 书籍列表 */}
			<BookList initialBooks={booksWithDate} />
		</div>
	);
}

