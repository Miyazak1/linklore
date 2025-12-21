# 全面修复计划

## 问题分析

### 1. 为什么宝塔终端运行时会发现很多问题？
- **原因**：本地开发环境可能使用了更宽松的 TypeScript 配置或缓存
- **服务器环境**：使用 `pnpm build` 进行严格类型检查，会暴露所有类型错误
- **Next.js 15**：对类型检查更严格，特别是路由参数类型

### 2. 修改是否破坏了功能？
- **已删除的功能**：语义溯源（Trace）和实践（Practice）相关功能已完全移除
- **保留的功能**：其他功能（讨论版、图书馆、周报摘要等）不受影响
- **词条（Entry）功能**：保留，但移除了与 Trace 的关联

### 3. 到底修改了什么？

#### 已删除的文件（约 50+ 个文件）：
- 所有 `trace` 相关的组件、API、库文件
- 所有 `practice` 相关的组件、API、库文件
- 测试文件

#### 已修改的文件：
1. **Navigation.tsx** - 注释掉语义溯源链接
2. **EntryDetail.tsx** - 移除 sourceTrace 显示，创建 SimpleCitationRenderer
3. **EntryList.tsx** - 需要移除 sourceTrace 引用
4. **entryOperations.ts** - 移除 trace 相关函数
5. **metrics.ts** - 移除 trace 统计
6. **health/route.ts** - 移除 traceSystem 检查
7. **home/page.tsx** - 移除 trace/entry 统计
8. **entries/route.ts** - 移除 sourceTrace 查询
9. **queue/jobs.ts** - 移除 traceAnalysis 和 practiceAnalysis 函数
10. **worker/ai-queue/index.ts** - 移除 traceAnalysis 处理
11. **ai/config/route.ts** - 移除 aiNickname 字段
12. **ai/nickname/route.ts** - 移除 aiNickname 数据库字段引用
13. **多个路由文件** - 修复 Next.js 15 参数类型、空文件问题

## 需要修复的剩余问题

### 1. dataLoader.ts - 包含 trace 相关函数
- `loadTracesBatch` - 需要删除或注释
- `loadAnalysesBatch` - 需要删除或注释
- `loadEntriesBatch` - 需要移除 sourceTrace include

### 2. citationManager.ts - 完全依赖 trace
- 整个文件都是为 trace 服务的，需要删除或注释所有函数

### 3. EntryList.tsx - 包含 sourceTrace 引用
- 需要移除 sourceTrace 类型定义和使用

### 4. 其他潜在问题
- 检查是否有其他文件引用了已删除的模块

## 修复策略

1. **批量修复**：一次性修复所有问题
2. **保持功能**：确保不破坏现有功能
3. **类型安全**：确保所有类型错误都修复
4. **测试**：修复后本地构建测试

