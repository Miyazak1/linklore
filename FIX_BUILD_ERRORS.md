# 修复构建错误

## 步骤 1：安装缺失的类型定义

在宝塔面板终端执行：

```bash
cd /www/wwwroot/linklore

# 安装缺失的类型定义包
pnpm add -D @types/sanitize-html @types/ali-oss
```

## 步骤 2：修复其他类型错误

我已经修复了以下文件：
- `apps/web/lib/processing/traceStateMachine.ts` - 添加了 `publishedAt` 到 select
- `apps/web/lib/ai/adapters.ts` - 修复了 error 类型处理
- `apps/web/lib/ai/semanticSimilarity.ts` - 添加了类型断言
- `apps/web/lib/ai/router.ts` - 添加了 'moderate' 任务类型
- `apps/web/lib/ai/moderation.ts` - 添加了 topicDrift 和 topicUnclear 字段
- `apps/web/lib/processing/traceAnalysis.ts` - 修复了 null 到 undefined 的转换
- `apps/web/lib/processing/extract.ts` - 修复了 marked() 的异步处理

## 步骤 3：处理剩余错误

还有一些错误需要处理：

1. **bullmq 和 ioredis 类型** - 这些包可能没有类型定义，需要检查
2. **practice 相关错误** - 这些可能是未使用的代码
3. **window/localStorage 错误** - 需要添加类型声明

## 步骤 4：重新构建

```bash
cd /www/wwwroot/linklore
pnpm build
```

