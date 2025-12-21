'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MessageIcon } from '@/components/ui/Icons';

interface Practice {
  id: string;
  title: string | null;
  summary: string | null;
  content?: string; // 列表页可能不包含完整内容
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
  verificationStatus?: string;
  realityCheck?: any;
  materialResults?: any;
}

export default function PracticeCard({ practice }: { practice: Practice }) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(practice.isLiked);
  const [isBookmarked, setIsBookmarked] = useState(practice.isBookmarked);
  const [likeCount, setLikeCount] = useState(practice.likeCount);
  const [bookmarkCount, setBookmarkCount] = useState(practice.bookmarkCount);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const res = await fetch(`/api/practices/${practice.id}/like`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setIsLiked(data.liked);
        setLikeCount(prev => data.liked ? prev + 1 : prev - 1);
      }
    } catch (error) {
      console.error('[PracticeCard] Like error:', error);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const res = await fetch(`/api/practices/${practice.id}/bookmark`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setIsBookmarked(data.bookmarked);
        setBookmarkCount(prev => data.bookmarked ? prev + 1 : prev - 1);
      }
    } catch (error) {
      console.error('[PracticeCard] Bookmark error:', error);
    }
  };

  // 优化：如果 summary 不存在，显示提示文本而不是加载完整 content
  const previewText = practice.summary || '点击查看完整内容...';
  const date = new Date(practice.createdAt).toLocaleDateString('zh-CN');

  const handleCardClick = (e: React.MouseEvent) => {
    // 如果点击的是按钮或链接，不处理卡片点击
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
    router.push(`/practices/${practice.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        display: 'block',
        background: 'var(--color-background-paper)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-xl)',
        border: '1px solid var(--color-border-light)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all var(--transition-fast)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
            {practice.title && (
              <h3 style={{
                margin: 0,
                fontSize: 'var(--font-size-lg)',
                fontWeight: 600,
                color: 'var(--color-text-primary)'
              }}>
                {practice.title}
              </h3>
            )}
            {practice.verificationStatus === 'verified' && (
              <span style={{
                padding: '2px 8px',
                background: 'var(--color-success)',
                color: 'white',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500
              }}>
                ✓ 已验证
              </span>
            )}
            {practice.verificationStatus === 'needs_review' && (
              <span style={{
                padding: '2px 8px',
                background: 'var(--color-warning)',
                color: 'white',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500
              }}>
                ⚠ 需审查
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            <span>{practice.author.name || '匿名'}</span>
            <span>·</span>
            <span>{date}</span>
            {practice.region && (
              <>
                <span>·</span>
                <span>{practice.region}</span>
              </>
            )}
            {practice.materialResults?.affectedPeople && (
              <>
                <span>·</span>
                <span>影响 {practice.materialResults.affectedPeople} 人</span>
              </>
            )}
          </div>
        </div>
        {practice.mediaFiles.length > 0 && practice.mediaFiles[0].thumbnailKey && (
          <img
            src={`/api/files/${practice.mediaFiles[0].thumbnailKey}`}
            alt=""
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'cover',
              borderRadius: 'var(--radius-md)',
              marginLeft: 'var(--spacing-md)'
            }}
          />
        )}
      </div>

      {/* Content Preview */}
      <p style={{
        margin: 0,
        marginBottom: 'var(--spacing-md)',
        color: 'var(--color-text-secondary)',
        lineHeight: 'var(--line-height-relaxed)',
        fontSize: 'var(--font-size-base)'
      }}>
        {previewText}
      </p>

      {/* Tags */}
      {practice.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}>
          {practice.tags.slice(0, 5).map((pt) => (
            <span
              key={pt.tag.id}
              style={{
                padding: '2px 8px',
                background: 'var(--color-background-subtle)',
                color: 'var(--color-text-secondary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)'
              }}
            >
              {pt.tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
          <button
            onClick={handleLike}
            style={{
              background: 'none',
              border: 'none',
              color: isLiked ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              padding: 'var(--spacing-xs)'
            }}
          >
            <span>{isLiked ? '❤️' : '🤍'}</span>
            <span>{likeCount}</span>
          </button>
          <Link
            href={`/practices/${practice.id}#comments`}
            onClick={(e) => e.stopPropagation()}
            style={{
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)'
            }}
          >
            <MessageIcon size={16} color="currentColor" />
            <span>{practice.commentCount}</span>
          </Link>
          <button
            onClick={handleBookmark}
            style={{
              background: 'none',
              border: 'none',
              color: isBookmarked ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              padding: 'var(--spacing-xs)'
            }}
          >
            <span>{isBookmarked ? '🔖' : '📑'}</span>
            <span>{bookmarkCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

