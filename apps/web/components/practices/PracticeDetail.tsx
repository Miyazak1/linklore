'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import PracticeCommentSection from './PracticeCommentSection';
import PracticeRealityCheck from './PracticeRealityCheck';
import PracticeVerification from './PracticeVerification';

interface PracticeDetailProps {
  practice: any;
}

export default function PracticeDetail({ practice }: PracticeDetailProps) {
  const [isLiked, setIsLiked] = useState(practice.isLiked);
  const [isBookmarked, setIsBookmarked] = useState(practice.isBookmarked);
  const [likeCount, setLikeCount] = useState(practice._count.likes);
  const [bookmarkCount, setBookmarkCount] = useState(practice._count.bookmarks);

  const handleLike = async () => {
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
      console.error('[PracticeDetail] Like error:', error);
    }
  };

  const handleBookmark = async () => {
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
      console.error('[PracticeDetail] Bookmark error:', error);
    }
  };

  const date = new Date(practice.createdAt).toLocaleDateString('zh-CN');

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'var(--color-background-paper)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-xl)',
        marginBottom: 'var(--spacing-xl)',
        border: '1px solid var(--color-border-light)'
      }}>
        {practice.title && (
          <h1 style={{
            margin: 0,
            marginBottom: 'var(--spacing-md)',
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 700,
            color: 'var(--color-text-primary)'
          }}>
            {practice.title}
          </h1>
        )}
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-lg)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)'
        }}>
          <span>{practice.author.name || '匿名'}</span>
          <span>·</span>
          <span>{date}</span>
          {practice.region && (
            <>
              <span>·</span>
              <span>{practice.region}</span>
            </>
          )}
        </div>

        {/* Tags */}
        {practice.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-lg)' }}>
            {practice.tags.map((pt: any) => (
              <span
                key={pt.tag.id}
                style={{
                  padding: '4px 12px',
                  background: 'var(--color-background-subtle)',
                  color: 'var(--color-text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                {pt.tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
          <button
            onClick={handleLike}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: isLiked ? 'var(--color-primary)' : 'var(--color-background-subtle)',
              color: isLiked ? 'white' : 'var(--color-text-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)'
            }}
          >
            <span>{isLiked ? '❤️' : '🤍'}</span>
            <span>{likeCount}</span>
          </button>
          <button
            onClick={handleBookmark}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: isBookmarked ? 'var(--color-primary)' : 'var(--color-background-subtle)',
              color: isBookmarked ? 'white' : 'var(--color-text-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)'
            }}
          >
            <span>{isBookmarked ? '🔖' : '📑'}</span>
            <span>{bookmarkCount}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        background: 'var(--color-background-paper)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-xl)',
        marginBottom: 'var(--spacing-xl)',
        border: '1px solid var(--color-border-light)'
      }}>
        <div style={{
          color: 'var(--color-text-primary)',
          lineHeight: 'var(--line-height-relaxed)',
          fontSize: 'var(--font-size-base)'
        }}>
          <ReactMarkdown>{practice.content}</ReactMarkdown>
        </div>

        {/* Media Files */}
        {practice.mediaFiles.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            {practice.mediaFiles.map((media: any) => (
              <img
                key={media.id}
                src={`/api/files/${media.fileKey}`}
                alt=""
                style={{
                  maxWidth: '100%',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-md)'
                }}
              />
            ))}
          </div>
        )}

        {/* 现实性检查 */}
        {practice.realityCheck && (
          <PracticeRealityCheck realityCheck={practice.realityCheck} />
        )}

        {/* 对象性关系 */}
        {practice.objectRelation && (
          <div style={{
            marginTop: 'var(--spacing-xl)',
            padding: 'var(--spacing-md)',
            background: 'var(--color-background-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <h4 style={{ margin: 0, marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
              对象性关系
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
              {practice.objectRelation.targetObject && (
                <div>
                  <strong>作用对象：</strong>{practice.objectRelation.targetObject}
                </div>
              )}
              {practice.objectRelation.actionType && (
                <div>
                  <strong>行动类型：</strong>{practice.objectRelation.actionType}
                </div>
              )}
              {practice.objectRelation.beforeState && (
                <div>
                  <strong>实践前状态：</strong>
                  <div style={{ marginTop: 'var(--spacing-xs)', color: 'var(--color-text-secondary)' }}>
                    {practice.objectRelation.beforeState}
                  </div>
                </div>
              )}
              {practice.objectRelation.afterState && (
                <div>
                  <strong>实践后状态：</strong>
                  <div style={{ marginTop: 'var(--spacing-xs)', color: 'var(--color-text-secondary)' }}>
                    {practice.objectRelation.afterState}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 物质性结果 */}
        {practice.materialResults && (
          <div style={{
            marginTop: 'var(--spacing-xl)',
            padding: 'var(--spacing-md)',
            background: 'var(--color-background-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <h4 style={{ margin: 0, marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
              物质性结果
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
              {practice.materialResults.affectedPeople && (
                <div>
                  <strong>影响人数：</strong>{practice.materialResults.affectedPeople} 人
                </div>
              )}
              {practice.materialResults.affectedScope && (
                <div>
                  <strong>影响范围：</strong>{practice.materialResults.affectedScope}
                </div>
              )}
              {practice.materialResults.quantitative && (
                <div>
                  <strong>量化结果：</strong>
                  <div style={{ marginTop: 'var(--spacing-xs)', color: 'var(--color-text-secondary)' }}>
                    {practice.materialResults.quantitative}
                  </div>
                </div>
              )}
              {practice.materialResults.qualitative && (
                <div>
                  <strong>质性结果：</strong>
                  <div style={{ marginTop: 'var(--spacing-xs)', color: 'var(--color-text-secondary)' }}>
                    {practice.materialResults.qualitative}
                  </div>
                </div>
              )}
              {practice.materialResults.duration && (
                <div>
                  <strong>持续时间：</strong>{practice.materialResults.duration}
                </div>
              )}
              {practice.materialResults.sustainability && (
                <div>
                  <strong>可持续性：</strong>{practice.materialResults.sustainability}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Theory References */}
        {practice.theoryReferences.length > 0 && (
          <div style={{
            marginTop: 'var(--spacing-xl)',
            padding: 'var(--spacing-lg)',
            background: 'var(--color-background-subtle)',
            borderRadius: 'var(--radius-md)'
          }}>
            <h3 style={{ margin: 0, marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-lg)' }}>
              理论引用
            </h3>
            {practice.theoryReferences.map((ref: any, idx: number) => (
              <div key={ref.id} style={{ marginBottom: 'var(--spacing-md)' }}>
                <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                  {ref.theorist} {ref.source && `- ${ref.source}`}
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', fontStyle: 'italic' }}>
                  {ref.quote}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Analysis */}
      {practice.aiAnalysis && (
        <div style={{
          background: 'var(--color-background-paper)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-xl)',
          marginBottom: 'var(--spacing-xl)',
          border: '1px solid var(--color-border-light)'
        }}>
          <h3 style={{ margin: 0, marginBottom: 'var(--spacing-md)' }}>AI分析</h3>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            <div>深度分数: {practice.aiAnalysis.depthScore.toFixed(2)}</div>
            <div>密度分数: {practice.aiAnalysis.densityScore.toFixed(2)}</div>
            {practice.aiAnalysis.keyPoints.length > 0 && (
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <strong>关键点:</strong>
                <ul>
                  {practice.aiAnalysis.keyPoints.map((point: string, idx: number) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 验证组件 */}
      <PracticeVerification 
        practiceId={practice.id} 
        currentStatus={practice.verificationStatus || 'unverified'} 
      />

      {/* Comments */}
      <div id="comments">
        <PracticeCommentSection practiceId={practice.id} />
      </div>
    </div>
  );
}

