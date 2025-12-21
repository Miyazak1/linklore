'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PracticeDetail from '@/components/practices/PracticeDetail';

export default function PracticeDetailPage() {
  const params = useParams();
  const practiceId = params.id as string;
  const [practice, setPractice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPractice = async () => {
      try {
        const res = await fetch(`/api/practices/${practiceId}`);
        if (!res.ok) throw new Error('Failed to load practice');
        const data = await res.json();
        setPractice(data);
      } catch (error) {
        console.error('[PracticeDetailPage] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (practiceId) {
      loadPractice();
    }
  }, [practiceId]);

  if (loading) {
    return (
      <main style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>加载中...</p>
      </main>
    );
  }

  if (!practice) {
    return (
      <main style={{ padding: 'var(--spacing-xl)', maxWidth: 1200, margin: '0 auto' }}>
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>实践记录不存在</p>
      </main>
    );
  }

  return (
    <main style={{ 
      padding: 'var(--spacing-xl)', 
      maxWidth: 1200, 
      margin: '0 auto',
      background: 'var(--color-background)',
      minHeight: 'calc(100vh - 200px)'
    }}>
      <PracticeDetail practice={practice} />
    </main>
  );
}










