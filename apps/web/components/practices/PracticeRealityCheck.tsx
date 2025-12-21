'use client';

interface RealityCheckData {
  hasConcreteAction: boolean;
  hasExternalImpact: boolean;
  hasMaterialResult: boolean;
  evidenceCount: number;
  suggestions: string[];
  score: number;
  reasoning?: string;
}

interface PracticeRealityCheckProps {
  realityCheck: RealityCheckData | null;
}

export default function PracticeRealityCheck({ realityCheck }: PracticeRealityCheckProps) {
  if (!realityCheck) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'var(--color-success)';
    if (score >= 0.5) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return '优秀';
    if (score >= 0.5) return '良好';
    return '需改进';
  };

  return (
    <div style={{
      padding: 'var(--spacing-md)',
      background: 'var(--color-background-subtle)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      marginTop: 'var(--spacing-md)'
    }}>
      <h4 style={{ margin: 0, marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
        现实性检查
      </h4>

      {/* 分数显示 */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>现实性分数：</span>
          <span style={{
            padding: '4px 12px',
            background: getScoreColor(realityCheck.score),
            color: 'white',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600
          }}>
            {Math.round(realityCheck.score * 100)}% - {getScoreLabel(realityCheck.score)}
          </span>
        </div>
      </div>

      {/* 三要素检查 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <span style={{ fontSize: '20px' }}>{realityCheck.hasConcreteAction ? '✓' : '✗'}</span>
          <span style={{ fontSize: 'var(--font-size-sm)', color: realityCheck.hasConcreteAction ? 'var(--color-success)' : 'var(--color-error)' }}>
            感性的：{realityCheck.hasConcreteAction ? '有具体行动' : '缺乏具体行动'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <span style={{ fontSize: '20px' }}>{realityCheck.hasExternalImpact ? '✓' : '✗'}</span>
          <span style={{ fontSize: 'var(--font-size-sm)', color: realityCheck.hasExternalImpact ? 'var(--color-success)' : 'var(--color-error)' }}>
            对象性的：{realityCheck.hasExternalImpact ? '作用于客观世界' : '缺乏作用对象'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <span style={{ fontSize: '20px' }}>{realityCheck.hasMaterialResult ? '✓' : '✗'}</span>
          <span style={{ fontSize: 'var(--font-size-sm)', color: realityCheck.hasMaterialResult ? 'var(--color-success)' : 'var(--color-error)' }}>
            现实的活动：{realityCheck.hasMaterialResult ? '有物质性结果' : '缺乏物质性结果'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            证据数量：{realityCheck.evidenceCount} 个
          </span>
        </div>
      </div>

      {/* 改进建议 */}
      {realityCheck.suggestions && realityCheck.suggestions.length > 0 && (
        <div style={{
          padding: 'var(--spacing-sm)',
          background: 'var(--color-background)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
            改进建议：
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {realityCheck.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 分析理由 */}
      {realityCheck.reasoning && (
        <div style={{
          marginTop: 'var(--spacing-md)',
          padding: 'var(--spacing-sm)',
          background: 'var(--color-background)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          fontStyle: 'italic'
        }}>
          {realityCheck.reasoning}
        </div>
      )}
    </div>
  );
}











