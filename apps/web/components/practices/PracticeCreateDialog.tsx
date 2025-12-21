'use client';

import { useState } from 'react';
import TheoryAssistant from './TheoryAssistant';

interface PracticeCreateDialogProps {
  onComplete: () => void;
  onCancel: () => void;
}

type RecordMode = 'SIMPLE' | 'STRUCTURED' | 'AI_ASSISTED';

export default function PracticeCreateDialog({ onComplete, onCancel }: PracticeCreateDialogProps) {
  const [mode, setMode] = useState<RecordMode>('SIMPLE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [structuredData, setStructuredData] = useState<any>({});
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiAssisting, setAiAssisting] = useState(false);

  // 简单模式字段
  const [simpleWhat, setSimpleWhat] = useState('');
  const [simpleResult, setSimpleResult] = useState('');
  const [simpleFeeling, setSimpleFeeling] = useState('');

  // AI协助模式
  const [aiInput, setAiInput] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  // 实践三要素字段
  const [concreteAction, setConcreteAction] = useState(''); // 具体行动
  const [timePlace, setTimePlace] = useState(''); // 时间地点
  const [participants, setParticipants] = useState(''); // 参与者
  const [targetObject, setTargetObject] = useState(''); // 作用对象
  const [beforeState, setBeforeState] = useState(''); // 实践前状态
  const [afterState, setAfterState] = useState(''); // 实践后状态
  const [quantitativeResult, setQuantitativeResult] = useState(''); // 量化结果
  const [qualitativeResult, setQualitativeResult] = useState(''); // 质性结果
  const [affectedPeople, setAffectedPeople] = useState<number | ''>(''); // 影响人数

  const handleAiAssist = async () => {
    if (!aiInput.trim()) {
      alert('请先输入简单的实践描述');
      return;
    }

    setAiAssisting(true);
    try {
      const res = await fetch('/api/practices/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simpleInput: aiInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data);
        setStructuredData(data.structuredData);
        setTitle(data.suggestedTitle || '');
        setTags(data.suggestedTags || []);
        setMode('STRUCTURED'); // 切换到结构化模式显示结果
      }
    } catch (error) {
      console.error('[PracticeCreateDialog] AI assist error:', error);
      alert('AI协助失败，请重试');
    } finally {
      setAiAssisting(false);
    }
  };

  const handleSubmit = async () => {
    let finalContent = '';
    let finalStructuredData: any = null;

    if (mode === 'SIMPLE') {
      finalContent = `## 具体做了什么？（不是想做什么）\n\n${simpleWhat}\n\n## 作用于什么？产生了什么改变？\n\n${simpleResult}\n\n## 物质性结果是什么？（可验证的数据或改变）\n\n${simpleFeeling}`;
    } else if (mode === 'STRUCTURED') {
      finalContent = content;
      finalStructuredData = { ...structuredData };
      
      // 添加实践三要素数据到structuredData
      if (concreteAction || timePlace || participants) {
        finalStructuredData.realityCheck = {
          concreteAction,
          timePlace,
          participants,
        };
      }
      
      if (targetObject || beforeState || afterState) {
        finalStructuredData.objectRelation = {
          targetObject,
          beforeState,
          afterState,
        };
      }
      
      if (quantitativeResult || qualitativeResult || affectedPeople) {
        finalStructuredData.materialResults = {
          quantitative: quantitativeResult,
          qualitative: qualitativeResult,
          affectedPeople: affectedPeople || undefined,
        };
      }
    } else if (mode === 'AI_ASSISTED') {
      finalContent = content;
      finalStructuredData = structuredData;
    }

    if (!finalContent.trim()) {
      alert('请输入内容');
      return;
    }

    // 验证必填字段（结构化模式）
    if (mode === 'STRUCTURED') {
      if (!concreteAction.trim()) {
        alert('请填写具体行动描述');
        return;
      }
      if (!timePlace.trim()) {
        alert('请填写时间地点');
        return;
      }
      if (!participants.trim()) {
        alert('请填写参与者');
        return;
      }
    }

    setLoading(true);
    try {
      const requestBody: any = {
        title: title || undefined,
        content: finalContent,
        recordMode: mode,
        tags: tags.length > 0 ? tags : undefined,
        status: 'published',
      };
      
      // 只在有值时添加 structuredData
      if (finalStructuredData && Object.keys(finalStructuredData).length > 0) {
        requestBody.structuredData = finalStructuredData;
      }
      
      // 添加materialResults和objectRelation（如果存在）
      if (mode === 'STRUCTURED' && finalStructuredData?.materialResults) {
        requestBody.materialResults = finalStructuredData.materialResults;
      }
      if (mode === 'STRUCTURED' && finalStructuredData?.objectRelation) {
        requestBody.objectRelation = finalStructuredData.objectRelation;
      }

      const res = await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        const result = await res.json();
        console.log('[PracticeCreateDialog] Practice created successfully:', result);
        onComplete();
      } else {
        const errorData = await res.json();
        console.error('[PracticeCreateDialog] Create failed:', errorData);
        // 处理 Zod 验证错误或其他错误格式
        let errorMessage = '创建失败';
        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (Array.isArray(errorData.error)) {
            // Zod 错误数组
            errorMessage = errorData.error.map((e: any) => e.message || e.path?.join('.')).join(', ');
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.details) {
          // Zod 错误详情
          errorMessage = errorData.details.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ');
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('[PracticeCreateDialog] Submit error:', error);
      alert('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'var(--color-background-paper)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--spacing-xl)',
      border: '1px solid var(--color-border-light)',
      maxWidth: 800,
      margin: '0 auto'
    }}>
      <h1 style={{ margin: 0, marginBottom: 'var(--spacing-lg)' }}>记录我的实践</h1>

      {/* 模式选择 */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
          <button
            onClick={() => setMode('SIMPLE')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: mode === 'SIMPLE' ? 'var(--color-primary)' : 'var(--color-background-subtle)',
              color: mode === 'SIMPLE' ? 'white' : 'var(--color-text-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            简单模式
          </button>
          <button
            onClick={() => setMode('STRUCTURED')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: mode === 'STRUCTURED' ? 'var(--color-primary)' : 'var(--color-background-subtle)',
              color: mode === 'STRUCTURED' ? 'white' : 'var(--color-text-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            结构化模式
          </button>
          <button
            onClick={() => setMode('AI_ASSISTED')}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: mode === 'AI_ASSISTED' ? 'var(--color-primary)' : 'var(--color-background-subtle)',
              color: mode === 'AI_ASSISTED' ? 'white' : 'var(--color-text-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            AI协助模式
          </button>
        </div>
      </div>

      {/* 简单模式 */}
      {mode === 'SIMPLE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 500 }}>
              具体做了什么？（不是想做什么）
            </label>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)', marginTop: 0 }}>
              请描述实际发生的行动，包括时间、地点、参与者
            </p>
            <textarea
              value={simpleWhat}
              onChange={(e) => setSimpleWhat(e.target.value)}
              placeholder="例如：2024年1月，我们在XX社区组织了一次互助活动，有20人参与..."
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
                resize: 'vertical'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 500 }}>
              作用于什么？产生了什么改变？
            </label>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)', marginTop: 0 }}>
              请说明作用对象（人/物/制度/环境）和实践前后的变化
            </p>
            <textarea
              value={simpleResult}
              onChange={(e) => setSimpleResult(e.target.value)}
              placeholder="例如：帮助了15个困难家庭，建立了互助网络，改变了社区氛围..."
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
                resize: 'vertical'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 500 }}>
              物质性结果是什么？（可验证的数据或改变）
            </label>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)', marginTop: 0 }}>
              请提供量化数据（人数、范围、持续时间）或质性改变（具体改变描述）
            </p>
            <textarea
              value={simpleFeeling}
              onChange={(e) => setSimpleFeeling(e.target.value)}
              placeholder="例如：帮助了15个家庭，建立了3个互助小组，活动持续了6个月..."
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
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      )}

      {/* 结构化模式 */}
      {mode === 'STRUCTURED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 500 }}>
              标题（可选）
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="实践标题"
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                fontFamily: 'inherit',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 500 }}>
              完整内容（Markdown格式）
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="详细描述你的实践..."
              style={{
                width: '100%',
                minHeight: '300px',
                padding: 'var(--spacing-md)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                fontFamily: 'inherit',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      )}

      {/* AI协助模式 */}
      {mode === 'AI_ASSISTED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 500 }}>
              简单描述你的实践
            </label>
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="例如：我们昨晚组织了一个阅读会..."
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
                resize: 'vertical'
              }}
            />
            <button
              onClick={handleAiAssist}
              disabled={aiAssisting || !aiInput.trim()}
              style={{
                marginTop: 'var(--spacing-sm)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: aiAssisting || !aiInput.trim() ? 'var(--color-background-subtle)' : 'var(--color-primary)',
                color: aiAssisting || !aiInput.trim() ? 'var(--color-text-secondary)' : 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: aiAssisting || !aiInput.trim() ? 'not-allowed' : 'pointer',
                fontSize: 'var(--font-size-sm)'
              }}
            >
              {aiAssisting ? 'AI思考中...' : '🤖 AI协助完善'}
            </button>
          </div>
          {aiSuggestions && (
            <div style={{
              padding: 'var(--spacing-md)',
              background: 'var(--color-background-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)'
            }}>
              <p style={{ margin: 0, marginBottom: 'var(--spacing-sm)' }}>
                <strong>AI建议的标题：</strong> {aiSuggestions.suggestedTitle}
              </p>
              <p style={{ margin: 0 }}>
                <strong>建议的标签：</strong> {aiSuggestions.suggestedTags?.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 理论对照助手 */}
      {(mode === 'STRUCTURED' || (mode === 'AI_ASSISTED' && content)) && (
        <TheoryAssistant content={mode === 'STRUCTURED' ? content : aiInput} />
      )}

      {/* 操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
        <button
          onClick={onCancel}
          style={{
            padding: 'var(--spacing-sm) var(--spacing-lg)',
            background: 'var(--color-background-subtle)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-base)'
          }}
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            padding: 'var(--spacing-sm) var(--spacing-lg)',
            background: loading ? 'var(--color-background-subtle)' : 'var(--color-primary)',
            color: loading ? 'var(--color-text-secondary)' : 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 'var(--font-size-base)',
            fontWeight: 500
          }}
        >
          {loading ? '发布中...' : '发布'}
        </button>
      </div>
    </div>
  );
}

