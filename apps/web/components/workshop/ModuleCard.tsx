'use client';

import { useState } from 'react';
import { TrashIcon, ChevronDownIcon, ChevronUpIcon } from '@/components/ui/Icons';
import type { GameModule, ModuleConfig } from '@/types/modules';
import { ModuleConfigForm } from './ModuleConfigForm';

interface ModuleCardProps {
  module: GameModule;
  config: ModuleConfig;
  isRequired?: boolean;
  onRemove: () => void;
  onConfigChange: (config: ModuleConfig) => void;
}

export function ModuleCard({
  module,
  config,
  isRequired = false,
  onRemove,
  onConfigChange
}: ModuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const IconComponent = module.icon;

  return (
    <div style={{
      marginBottom: 'var(--spacing-sm)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-background)',
      overflow: 'hidden'
    }}>
      {/* 模块头部 */}
      <div style={{
        padding: 'var(--spacing-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        cursor: 'pointer',
        background: config.enabled !== false 
          ? 'var(--color-primary-lighter)' 
          : 'var(--color-background-subtle)'
      }}
      onClick={() => setIsExpanded(!isExpanded)}
      >
        <IconComponent 
          size={18} 
          color={config.enabled !== false ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} 
        />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)'
          }}>
            {module.name}
            {isRequired && (
              <span style={{
                fontSize: '10px',
                padding: '1px 4px',
                background: 'var(--color-error-lighter)',
                color: 'var(--color-error)',
                borderRadius: 'var(--radius-xs)'
              }}>
                必选
              </span>
            )}
          </div>
          <div style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-secondary)'
          }}>
            {module.description}
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)'
        }}>
          {!isRequired && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{
                padding: 'var(--spacing-xxs)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-error-lighter)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <TrashIcon size={14} color="var(--color-error)" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUpIcon size={16} color="var(--color-text-tertiary)" />
          ) : (
            <ChevronDownIcon size={16} color="var(--color-text-tertiary)" />
          )}
        </div>
      </div>

      {/* 配置表单（展开时显示） */}
      {isExpanded && (
        <div style={{
          padding: 'var(--spacing-sm)',
          borderTop: '1px solid var(--color-border-light)',
          background: 'var(--color-background-paper)'
        }}>
          <ModuleConfigForm
            module={module}
            config={config}
            onChange={onConfigChange}
          />
        </div>
      )}
    </div>
  );
}



