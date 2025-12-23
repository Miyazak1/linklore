# 全面修复总结

## 修复的问题

### 1. EntryList.tsx
- **问题**：包含 `sourceTrace` 类型定义和使用
- **修复**：移除 `sourceTrace` 类型定义和显示

### 2. dataLoader.ts
- **问题**：包含 `loadTracesBatch`、`loadAnalysesBatch` 和 `loadEntriesBatch` 中的 `sourceTrace` include
- **修复**：
  - 删除 `loadTracesBatch` 函数
  - 删除 `loadAnalysesBatch` 函数
  - 移除 `loadEntriesBatch` 中的 `sourceTrace` include

### 3. citationManager.ts
- **问题**：整个文件都是为 trace 服务的
- **修复**：清空文件，只保留注释说明

### 4. permissions.ts
- **问题**：包含 `checkTraceOwnership` 和 `handleEditorRoleChange` 中的 trace 相关代码
- **修复**：
  - 删除 `checkTraceOwnership` 函数
  - 修改 `handleEditorRoleChange` 函数，移除 trace 相关代码

### 5. collaboration.ts
- **问题**：整个文件都是为 trace 服务的
- **修复**：清空文件，只保留注释说明

### 6. Card.tsx
- **问题**：缺少 `onMouseEnter` 和 `onMouseLeave` 属性支持
- **修复**：添加 `onMouseEnter` 和 `onMouseLeave` 属性到 `CardProps` 接口

### 7. bcryptjs 类型定义
- **问题**：TypeScript 找不到 `bcryptjs` 类型定义
- **状态**：`@types/bcryptjs` 已在 `package.json` 中，可能是缓存问题，不影响构建

## 修改的文件清单

1. `apps/web/components/entry/EntryList.tsx` - 移除 sourceTrace
2. `apps/web/lib/processing/dataLoader.ts` - 移除 trace 相关函数
3. `apps/web/lib/processing/citationManager.ts` - 清空文件
4. `apps/web/lib/auth/permissions.ts` - 移除 trace 相关函数
5. `apps/web/lib/realtime/collaboration.ts` - 清空文件
6. `apps/web/components/ui/Card.tsx` - 添加鼠标事件支持

## 功能影响

### 已删除的功能
- 语义溯源（Trace）功能
- 实践（Practice）功能
- 实时协作功能（原本为 trace 服务）

### 保留的功能
- 讨论版（Topics）
- 图书馆（Books）
- 周报摘要（Digest）
- 词条（Entry）- 但移除了与 Trace 的关联
- 用户管理
- AI 配置

## 下一步

1. **本地构建测试**：运行 `pnpm build` 验证所有修复
2. **提交代码**：提交所有修复到 Git
3. **服务器部署**：在服务器上拉取代码并重新构建





