'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  createdAt: string;
  replies: Comment[];
  _count: {
    replies: number;
  };
}

export default function PracticeCommentSection({ practiceId }: { practiceId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/practices/${practiceId}/comments`);
      if (!res.ok) throw new Error('Failed to load comments');
      const data = await res.json();
      setComments(data.comments);
    } catch (error) {
      console.error('[PracticeCommentSection] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [practiceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`/api/practices/${practiceId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        setNewComment('');
        loadComments();
      }
    } catch (error) {
      console.error('[PracticeCommentSection] Submit error:', error);
    }
  };

  if (loading) {
    return <div style={{ padding: 'var(--spacing-lg)' }}>加载中...</div>;
  }

  return (
    <div style={{
      background: 'var(--color-background-paper)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--spacing-xl)',
      border: '1px solid var(--color-border-light)'
    }}>
      <h3 style={{ margin: 0, marginBottom: 'var(--spacing-lg)' }}>评论</h3>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--spacing-xl)' }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="写下你的评论..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: 'var(--spacing-md)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-base)',
            fontFamily: 'inherit',
            background: 'var(--color-background)',
            color: 'var(--color-text-primary)',
            resize: 'vertical',
            marginBottom: 'var(--spacing-md)'
          }}
        />
        <button
          type="submit"
          style={{
            padding: 'var(--spacing-sm) var(--spacing-lg)',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-base)',
            fontWeight: 500
          }}
        >
          发表评论
        </button>
      </form>

      {/* Comments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {comments.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            还没有评论，成为第一个评论者吧！
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const date = new Date(comment.createdAt).toLocaleDateString('zh-CN');

  return (
    <div style={{
      padding: 'var(--spacing-md)',
      background: 'var(--color-background-subtle)',
      borderRadius: 'var(--radius-md)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--spacing-sm)'
      }}>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          <strong>{comment.author.name || '匿名'}</strong>
          <span style={{ marginLeft: 'var(--spacing-sm)' }}>{date}</span>
        </div>
      </div>
      <div style={{ color: 'var(--color-text-primary)' }}>
        <ReactMarkdown>{comment.content}</ReactMarkdown>
      </div>
      {comment.replies.length > 0 && (
        <div style={{ marginTop: 'var(--spacing-md)', paddingLeft: 'var(--spacing-lg)', borderLeft: '2px solid var(--color-border)' }}>
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} />
          ))}
        </div>
      )}
    </div>
  );
}











