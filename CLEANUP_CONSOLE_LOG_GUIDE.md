# Console.log 清理指南

## 概述

本项目需要将所有的 `console.log/error/warn/info/debug` 迁移到统一的日志工具 `lib/utils/logger.ts`。

## 统计

- **总数量**: 844 处 console.log（109 个文件）
- **API 路由**: 107 处（28 个文件）
- **组件**: 93 处（23 个文件）
- **其他**: 644 处（58 个文件）

## 已清理的文件

1. ✅ `apps/web/app/(main)/page.tsx`
2. ✅ `apps/web/lib/ai/router.ts`
3. ✅ `apps/web/lib/processing/extract.ts`

## 清理步骤

### 1. 导入日志工具

在文件顶部添加：

```typescript
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('ModuleName');
```

### 2. 替换 console.log

**替换规则**：

- `console.log('[Module] message')` → `log.debug('message')`
- `console.log('[Module] message', data)` → `log.debug('message', { data })`
- `console.error('[Module] message', err)` → `log.error('message', err)`
- `console.warn('[Module] message', data)` → `log.warn('message', { data })`
- `console.info('[Module] message')` → `log.info('message')`

### 3. 示例

**之前**：
```typescript
console.log(`[Extract] Starting extraction for document ${documentId}`);
console.error(`[Extract] Failed to load file:`, fileErr);
```

**之后**：
```typescript
log.debug('Starting extraction', { documentId });
log.error('Failed to load file', fileErr);
```

## 优先级文件列表

### 高优先级（核心业务逻辑）

1. `apps/web/lib/processing/summarize.ts` - 文档摘要处理
2. `apps/web/lib/processing/evaluate.ts` - 文档评价处理
3. `apps/web/lib/processing/consensusTracker.ts` - 共识追踪
4. `apps/web/lib/queue/jobs.ts` - 队列任务
5. `apps/web/app/api/uploads/complete/route.ts` - 文件上传完成

### 中优先级（API 路由）

- `apps/web/app/api/topics/**/*.ts` - 话题相关 API
- `apps/web/app/api/books/**/*.ts` - 图书相关 API
- `apps/web/app/api/admin/**/*.ts` - 管理相关 API

### 低优先级（组件）

- `apps/web/components/**/*.tsx` - React 组件

## 注意事项

1. **生产环境**: 默认只显示 `warn` 和 `error` 级别日志
2. **开发环境**: 显示所有级别日志（包括 `debug` 和 `info`）
3. **环境变量**: 可通过 `LOG_LEVEL` 或 `NEXT_PUBLIC_LOG_LEVEL` 自定义日志级别
4. **Sentry 集成**: `error` 级别日志会自动发送到 Sentry（如果配置了）

## 批量清理脚本（可选）

可以使用以下 PowerShell 脚本批量查找需要清理的文件：

```powershell
# 查找所有包含 console.log 的文件
Get-ChildItem -Path apps/web -Recurse -Include *.ts,*.tsx | 
    Select-String -Pattern "console\.(log|error|warn|info|debug)" | 
    Select-Object -Unique Path | 
    ForEach-Object { $_.Path }
```

## 完成标准

- [ ] 所有 API 路由文件已清理
- [ ] 所有 lib/processing 文件已清理
- [ ] 所有 lib/queue 文件已清理
- [ ] 关键组件已清理
- [ ] 运行 `pnpm lint` 无错误
- [ ] 运行 `pnpm build` 成功

## 测试

清理后，确保：
1. 开发环境日志正常显示
2. 生产环境只显示 warn 和 error
3. 错误日志正确发送到 Sentry（如果配置了）


