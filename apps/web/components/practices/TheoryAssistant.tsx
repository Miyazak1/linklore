'use client';

import { useState, useEffect } from 'react';

interface TheorySuggestion {
  theorist: string;
  source?: string;
  quote: string;
  relevance: number;
  page?: string;
  year?: number;
}

export default function TheoryAssistant({ content }: { content: string }) {
  const [suggestions, setSuggestions] = useState<TheorySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadSuggestions = async () => {
    if (!content.trim() || content.length < 50) return;

    setLoading(true);
    try {
      const res = await fetch('/api/practices/ai/theory-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setExpanded(true);
      }
    } catch (error) {
      console.error('[TheoryAssistant] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!expanded && !loading) {
    return (
      <div style={{
        marginTop: 'var(--spacing-lg)',
        padding: 'var(--spacing-md)',
        background: 'var(--color-background-subtle)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)'
      }}>
        <button
          onClick={loadSuggestions}
          disabled={loading || !content.trim() || content.length < 50}
          style={{
            width: '100%',
            padding: 'var(--spacing-sm)',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 'var(--font-size-sm)',
            textAlign: 'left'
          }}
        >
          {loading ? '加载中...' : '💡 获取理论建议'}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 'var(--spacing-lg)',
      padding: 'var(--spacing-md)',
      background: 'var(--color-background-subtle)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)' }}>理论对照助手</h4>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)'
          }}
        >
          收起
        </button>
      </div>
      
      {loading ? (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>加载中...</p>
      ) : suggestions.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>暂无理论建议</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--color-background-paper)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>
                {suggestion.theorist} {suggestion.source && `- ${suggestion.source}`}
                {suggestion.year && ` (${suggestion.year})`}
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', fontStyle: 'italic', marginBottom: 'var(--spacing-xs)' }}>
                {suggestion.quote}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                相关性: {(suggestion.relevance * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}








