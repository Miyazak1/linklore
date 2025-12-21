'use client';

import PracticeCreateDialog from '@/components/practices/PracticeCreateDialog';
import { useRouter } from 'next/navigation';

export default function CreatePracticePage() {
  const router = useRouter();

  const handleComplete = () => {
    // 使用 refresh 参数强制刷新列表
    router.push('/practices?refresh=' + Date.now());
    // 延迟一下再刷新，确保数据已保存
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  const handleCancel = () => {
    router.push('/practices');
  };

  return (
    <main style={{ 
      padding: 'var(--spacing-xl)', 
      maxWidth: 1000, 
      margin: '0 auto',
      background: 'var(--color-background)',
      minHeight: 'calc(100vh - 200px)'
    }}>
      <PracticeCreateDialog onComplete={handleComplete} onCancel={handleCancel} />
    </main>
  );
}

