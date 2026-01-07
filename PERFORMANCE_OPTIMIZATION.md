# 性能优化总结

## 版本
- 时间戳: 2025-01-21
- 版本: v1.0.0

## 变更清单

### 1. API 路由缓存优化

#### `/api/topics/list` (apps/web/app/api/topics/list/route.ts)
- **变更**: 添加 Redis/内存缓存层
- **缓存策略**:
  - 话题列表：60秒缓存（基于 page, limit, discipline 参数）
  - 学科列表：5分钟缓存（独立缓存，更新频率低）
- **预期效果**: 减少数据库查询，提升列表加载速度 50-80%

#### `/api/games/baike/stats` (apps/web/app/api/games/baike/stats/route.ts)
- **变更**: 添加 30秒缓存
- **缓存策略**: 基于日期参数缓存统计信息
- **预期效果**: 减少重复的聚合查询，响应时间降低 60-70%

#### `/api/games/daily-issue/[date]` (apps/web/app/api/games/daily-issue/[date]/route.ts)
- **变更**: 添加 5分钟缓存
- **缓存策略**: 每日议题数据不变，适合长期缓存
- **预期效果**: 避免重复构建决策树，响应时间降低 80-90%

### 2. Next.js 配置优化

#### 压缩与优化 (apps/web/next.config.mjs)
- **变更**: 
  - 启用 `compress: true`（Gzip 压缩）
  - 启用 `swcMinify: true`（SWC 压缩器，比 Terser 更快）
  - 优化图片格式（AVIF, WebP）
  - 自定义代码分割策略
- **预期效果**:
  - Bundle 大小减少 20-30%
  - 首屏加载时间减少 15-25%
  - 图片加载时间减少 30-40%

#### 代码分割策略
- **变更**: 自定义 webpack splitChunks 配置
  - Framework chunks: React/ReactDOM 单独打包
  - Large libraries: 大于 160KB 的库单独打包
  - Commons: 共享代码提取
  - Shared: 动态共享块
- **预期效果**:
  - 初始 bundle 减少 40-50%
  - 并行加载提升 30-40%
  - 缓存命中率提升

### 3. Console.log 清理

#### 已完成清理的文件
- `apps/web/lib/processing/summarize.ts`
- `apps/web/lib/processing/evaluate.ts`
- `apps/web/lib/processing/status.ts`
- `apps/web/lib/processing/retry.ts`
- `apps/web/lib/processing/consensusTracker.ts`
- `apps/web/lib/processing/analyzeDisagreements.ts`
- `apps/web/lib/processing/topicConsensusAggregator.ts`
- `apps/web/lib/processing/userPairConsensus.ts`
- `apps/web/lib/queue/jobs.ts`
- `apps/web/app/(main)/page.tsx`
- `apps/web/lib/ai/router.ts`
- `apps/web/lib/processing/extract.ts`

#### 迁移方案
- 所有 `console.log` 迁移到统一日志工具 `@/lib/utils/logger`
- 使用 `createModuleLogger` 创建模块化日志器
- 日志级别：`debug`, `warn`, `error`
- 生产环境自动过滤 debug 级别日志

## 性能指标预期

### API 响应时间
- 话题列表: 200-300ms → 50-100ms (缓存命中)
- 游戏统计: 150-250ms → 30-50ms (缓存命中)
- 每日议题: 500-800ms → 50-100ms (缓存命中)

### 前端加载时间
- 首屏加载: 减少 15-25%
- Bundle 大小: 减少 20-30%
- 图片加载: 减少 30-40%

### 数据库负载
- 查询次数: 减少 40-60% (通过缓存)
- 聚合查询: 减少 60-80% (统计类 API)

## 缓存失效策略

### 自动失效
- 话题列表: 60秒自动过期
- 游戏统计: 30秒自动过期
- 每日议题: 5分钟自动过期
- 学科列表: 5分钟自动过期

### 手动失效
当数据更新时，需要手动清除相关缓存：
```typescript
import { deleteCache, clearCache } from '@/lib/cache/redis';

// 清除单个缓存
await deleteCache('topics:list:1:20:all');

// 清除模式匹配的缓存
await clearCache('topics:list:*');
```

## 测试步骤

### 1. 缓存功能测试
```bash
# 1. 启动开发服务器
cd apps/web
pnpm dev

# 2. 测试话题列表 API（首次请求应查询数据库）
curl http://localhost:3000/api/topics/list

# 3. 立即再次请求（应命中缓存，响应更快）
curl http://localhost:3000/api/topics/list

# 4. 等待 60 秒后请求（缓存过期，重新查询）
```

### 2. Bundle 分析
```bash
# 安装分析工具
pnpm add -D @next/bundle-analyzer

# 构建并分析
ANALYZE=true pnpm build
```

### 3. 性能监控
- 使用浏览器 DevTools Network 面板检查：
  - 响应时间
  - Bundle 大小
  - 缓存命中率（查看 Response Headers）

## 已知限制

1. **内存缓存限制**: 内存缓存最多存储 1000 条，超出后自动清理过期条目
2. **Redis 依赖**: 如果 Redis 不可用，自动降级到内存缓存
3. **缓存一致性**: 数据更新后需要手动清除相关缓存（未来可考虑实现自动失效）

## 回退方案

### 禁用缓存
如果缓存导致问题，可以临时禁用：
```typescript
// 在对应的 API 路由中注释掉缓存相关代码
// const cached = await getCache(cacheKey);
// if (cached) return NextResponse.json(cached);
```

### 回退 Next.js 配置
```bash
git checkout apps/web/next.config.mjs
```

## 下一步优化建议

1. **更多 API 路由缓存**: 
   - `/api/topics/[id]` - 话题详情
   - `/api/books/list` - 书籍列表
   - `/api/games/baike/question` - 游戏题目

2. **数据库查询优化**:
   - 添加索引优化（如 topics.discipline）
   - 使用 Prisma 的 select 优化查询字段

3. **CDN 配置**:
   - 静态资源 CDN 加速
   - 图片 CDN 优化

4. **服务端渲染优化**:
   - 使用 Next.js 15 的 Partial Prerendering (PPR)
   - 优化 Streaming SSR

5. **监控与告警**:
   - 集成性能监控（如 Vercel Analytics）
   - 设置缓存命中率告警

## 相关文件

- `apps/web/lib/cache/redis.ts` - 缓存工具
- `apps/web/next.config.mjs` - Next.js 配置
- `apps/web/app/api/topics/list/route.ts` - 话题列表 API
- `apps/web/app/api/games/baike/stats/route.ts` - 游戏统计 API
- `apps/web/app/api/games/daily-issue/[date]/route.ts` - 每日议题 API
- `apps/web/lib/utils/logger.ts` - 统一日志工具




