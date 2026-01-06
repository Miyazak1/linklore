'use client';

import { PlusIcon } from '@/components/ui/Icons';
import type { GameModule, ModuleConfig } from '@/types/modules';
import type { QuestionType } from '@/types/workshop';
import { AVAILABLE_MODULES } from '@/types/modules';
import { ModuleCard } from './ModuleCard';

interface ModulePanelProps {
  enabledModules: Map<string, ModuleConfig>;
  selectedGameType: QuestionType | string | null;
  onAddModule: (moduleId: string) => void;
  onRemoveModule: (moduleId: string) => void;
  onUpdateConfig: (moduleId: string, config: ModuleConfig) => void;
  availableModules: GameModule[];
}

export function ModulePanel({
  enabledModules,
  selectedGameType,
  onAddModule,
  onRemoveModule,
  onUpdateConfig,
  availableModules
}: ModulePanelProps) {
  return (
    <div style={{
      position: 'fixed',
      right: 'var(--spacing-xl)',
      top: '120px',
      width: '320px',
      maxHeight: 'calc(100vh - 160px)',
      overflowY: 'auto',
      background: 'var(--color-background-paper)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border-light)',
      padding: 'var(--spacing-lg)',
      boxShadow: 'var(--shadow-md)',
      zIndex: 100
    }}>
      {/* 已启用模块区域 */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{
          fontSize: 'var(--font-size-base)',
          fontWeight: 600,
          marginBottom: 'var(--spacing-md)',
          color: 'var(--color-text-primary)'
        }}>
          已启用模块 ({enabledModules.size})
        </h3>
        
        {enabledModules.size === 0 ? (
          <p style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
            padding: 'var(--spacing-md)',
            margin: 0
          }}>
            暂无已启用模块
          </p>
        ) : (
          Array.from(enabledModules.entries()).map(([moduleId, config]) => {
            // 从 AVAILABLE_MODULES 中查找模块定义，而不是从 availableModules（那是未启用的模块）
            const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
            if (!module) return null;
            
            return (
              <ModuleCard
                key={moduleId}
                module={module}
                config={config}
                isRequired={config.required}
                onRemove={() => onRemoveModule(moduleId)}
                onConfigChange={(newConfig) => onUpdateConfig(moduleId, newConfig)}
              />
            );
          })
        )}
      </div>
      
      {/* 模块库区域 */}
      <div>
        <h3 style={{
          fontSize: 'var(--font-size-base)',
          fontWeight: 600,
          marginBottom: 'var(--spacing-md)',
          color: 'var(--color-text-primary)'
        }}>
          添加模块
        </h3>
        
        {availableModules.length === 0 ? (
          <p style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
            padding: 'var(--spacing-md)',
            margin: 0
          }}>
            所有模块已启用
          </p>
        ) : (
          availableModules.map(module => {
            const IconComponent = module.icon;
            return (
              <button
                key={module.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('点击添加模块:', module.id);
                  onAddModule(module.id);
                }}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  marginBottom: 'var(--spacing-xs)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-background)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.background = 'var(--color-primary-lighter)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.background = 'var(--color-background)';
                }}
              >
                <IconComponent size={18} color="var(--color-primary)" />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: 500, 
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-primary)'
                  }}>
                    {module.name}
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: 'var(--color-text-secondary)'
                  }}>
                    {module.description}
                  </div>
                </div>
                <PlusIcon size={14} color="var(--color-primary)" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

