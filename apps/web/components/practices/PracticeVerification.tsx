'use client';

import { useState, useEffect } from 'react';

interface PracticeVerificationProps {
  practiceId: string;
  currentStatus: string;
}

export default function PracticeVerification({ practiceId, currentStatus }: PracticeVerificationProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [verificationInfo, setVerificationInfo] = useState<any>(null);

  useEffect(() => {
    // 加载验证信息
    fetch(`/api/practices/${practiceId}/verify`)
      .then(res => res.json())
      .then(data => {
        setVerificationInfo(data);
        setStatus(data.verificationStatus || 'unverified');
      })
      .catch(err => console.error('[PracticeVerification] Load error:', err));
  }, [practiceId]);

  const handleVerify = async (newStatus: 'verified' | 'needs_review') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/practices/${practiceId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(data.practice.verificationStatus);
        setNotes('');
        // 重新加载验证信息
        const infoRes = await fetch(`/api/practices/${practiceId}/verify`);
        const info = await infoRes.json();
        setVerificationInfo(info);
      } else {
        const error = await res.json();
        alert(error.error || '验证失败');
      }
    } catch (error) {
      console.error('[PracticeVerification] Verify error:', error);
      alert('验证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'verified':
        return (
          <span style={{
            padding: '4px 12px',
            background: 'var(--color-success)',
            color: 'white',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500
          }}>
            ✓ 已验证
          </span>
        );
      case 'needs_review':
        return (
          <span style={{
            padding: '4px 12px',
            background: 'var(--color-warning)',
            color: 'white',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500
          }}>
            ⚠ 需审查
          </span>
        );
      default:
        return (
          <span style={{
            padding: '4px 12px',
            background: 'var(--color-background-subtle)',
            color: 'var(--color-text-secondary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500
          }}>
            待验证
          </span>
        );
    }
  };

  return (
    <div style={{
      padding: 'var(--spacing-md)',
      background: 'var(--color-background-subtle)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      marginTop: 'var(--spacing-md)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>验证状态</h4>
        {getStatusBadge()}
      </div>

      {verificationInfo?.verifier && (
        <div style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          验证人：{verificationInfo.verifier.name || '匿名'}
          {verificationInfo.verifiedAt && (
            <span style={{ marginLeft: 'var(--spacing-sm)' }}>
              · {new Date(verificationInfo.verifiedAt).toLocaleDateString('zh-CN')}
            </span>
          )}
        </div>
      )}

      {verificationInfo?.verificationNotes && (
        <div style={{
          padding: 'var(--spacing-sm)',
          background: 'var(--color-background)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--spacing-md)'
        }}>
          {verificationInfo.verificationNotes}
        </div>
      )}

      {status !== 'verified' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="验证备注（可选）"
            style={{
              width: '100%',
              minHeight: '60px',
              padding: 'var(--spacing-sm)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'inherit',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button
              onClick={() => handleVerify('verified')}
              disabled={loading}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'var(--color-success)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 'var(--font-size-sm)',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '提交中...' : '标记为已验证'}
            </button>
            <button
              onClick={() => handleVerify('needs_review')}
              disabled={loading}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'var(--color-warning)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 'var(--font-size-sm)',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '提交中...' : '标记为需审查'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}











