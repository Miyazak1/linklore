'use client';

import type { GameModule, ModuleConfig } from '@/types/modules';

interface ModuleConfigFormProps {
  module: GameModule;
  config: ModuleConfig;
  onChange: (config: ModuleConfig) => void;
}

export function ModuleConfigForm({
  module,
  config,
  onChange
}: ModuleConfigFormProps) {
  const updateField = (key: string, value: any) => {
    const newConfig = {
      ...config,
      [key]: value
    };
    onChange(newConfig);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-sm)'
    }}>
      {module.configSchema.fields.map((field) => {
        const value = config[field.key] !== undefined 
          ? config[field.key] 
          : field.defaultValue;

        return (
          <div key={field.key}>
            <label style={{
              display: 'block',
              marginBottom: 'var(--spacing-xxs)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 500,
              color: 'var(--color-text-secondary)'
            }}>
              {field.label}
              {field.description && (
                <span style={{
                  fontSize: '10px',
                  color: 'var(--color-text-tertiary)',
                  marginLeft: 'var(--spacing-xxs)'
                }}>
                  ({field.description})
                </span>
              )}
            </label>

            {field.type === 'boolean' && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={value === true}
                  onChange={(e) => updateField(field.key, e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-primary)'
                }}>
                  {value ? '已启用' : '未启用'}
                </span>
              </label>
            )}

            {field.type === 'number' && (
              <input
                type="number"
                value={value || field.defaultValue}
                onChange={(e) => {
                  const numValue = field.type === 'number' 
                    ? parseInt(e.target.value) || field.defaultValue
                    : e.target.value;
                  updateField(field.key, numValue);
                }}
                min={field.min}
                max={field.max}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-xs)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text-primary)'
                }}
              />
            )}

            {field.type === 'select' && field.options && (
              <select
                value={value || field.defaultValue}
                onChange={(e) => updateField(field.key, e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-xs)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer'
                }}
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'string' && (
              <input
                type="text"
                value={value || field.defaultValue}
                onChange={(e) => updateField(field.key, e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-xs)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text-primary)'
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}



