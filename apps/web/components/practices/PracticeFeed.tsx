'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PracticeCard from './PracticeCard';
import Link from 'next/link';

interface Practice {
  id: string;
  title: string | null;
  summary: string | null;
  content?: string; // 列表页可能不包含完整内容（优化性能）
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  tags: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
  mediaFiles: Array<{
    id: string;
    fileKey: string;
    thumbnailKey: string | null;
  }>;
  practiceType: string | null;
  region: string | null;
  createdAt: string;
  isLiked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
}

export default function PracticeFeed() {
  const router = useRouter();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'depth' | 'latest' | 'hot'>('depth');
  const [hasMore, setHasMore] = useState(true);

  const loadPractices = async (pageNum: number, sortType: typeof sort) => {
    try {
      // 优化：移除 cache: 'no-store'，使用浏览器默认缓存
      // API 端已经设置了 Cache-Control 头，浏览器会自动缓存
      const res = await fetch(`/api/practices?page=${pageNum}&limit=20&sort=${sortType}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[PracticeFeed] API Error:', res.status, errorData);
        throw new Error(errorData.error || `Failed to load practices (${res.status})`);
      }
      
      const data = await res.json();
      
      if (!data.practices) {
        console.error('[PracticeFeed] Invalid response format:', data);
        throw new Error('Invalid response format');
      }
      
      if (pageNum === 1) {
        setPractices(data.practices || []);
      } else {
        setPractices(prev => [...prev, ...(data.practices || [])]);
      }
      
      setHasMore((data.practices || []).length === 20);
    } catch (error: any) {
      console.error('[PracticeFeed] Error:', error);
      // 显示错误信息给用户
      if (pageNum === 1) {
        setPractices([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    setLoading(true);
    setPage(1);
    loadPractices(1, sort);
  }, [sort]);

  // 监听 URL 中的 refresh 参数，当从创建页面返回时刷新数据
  useEffect(() => {
    const checkRefresh = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has('refresh')) {
        // 移除 refresh 参数
        params.delete('refresh');
        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newUrl);
        // 刷新数据
        if (!loading) {
          setLoading(true);
          setPage(1);
          loadPractices(1, sort);
        }
      }
    };

    checkRefresh();
    // 也监听 popstate 事件（浏览器前进/后退）
    window.addEventListener('popstate', checkRefresh);
    return () => window.removeEventListener('popstate', checkRefresh);
  }, [sort, loading]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPractices(nextPage, sort);
    }
  };

  if (loading && practices.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>加载中...</p>
      </div>
    );
  }

  return (
    <div>
      {/* 排序和创建按钮 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--spacing-xl)',
        flexWrap: 'wrap',
        gap: 'var(--spacing-md)'
      }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button
            onClick={() => setSort('depth')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: sort === 'depth' ? 'var(--color-primary)' : 'var(--color-background-paper)',
              color: sort === 'depth' ? 'white' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            深度优先
          </button>
          <button
            onClick={() => setSort('latest')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: sort === 'latest' ? 'var(--color-primary)' : 'var(--color-background-paper)',
              color: sort === 'latest' ? 'white' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            最新
          </button>
          <button
            onClick={() => setSort('hot')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: sort === 'hot' ? 'var(--color-primary)' : 'var(--color-background-paper)',
              color: sort === 'hot' ? 'white' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            热门
          </button>
        </div>
        <Link
          href="/practices/create"
          style={{
            padding: 'var(--spacing-sm) var(--spacing-lg)',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-base)',
            fontWeight: 500,
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          记录我的实践
        </Link>
      </div>

      {/* 实践列表 */}
      {practices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
            还没有实践记录，成为第一个记录者吧！
          </p>
          <Link
            href="/practices/create"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-lg)',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-base)',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            记录我的实践
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {practices.map((practice) => (
            <PracticeCard key={practice.id} practice={practice} />
          ))}
          
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--color-background-paper)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 'var(--font-size-base)',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

