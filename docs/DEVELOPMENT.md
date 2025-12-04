# LinkLore 开发指南

## 项目结构

```
linklore/
├── apps/
│   └── web/              # Next.js 15 应用
│       ├── app/          # App Router 页面和路由
│       ├── components/   # React 组件
│       ├── lib/          # 工具函数和业务逻辑
│       └── __tests__/    # 测试文件
├── packages/             # 共享包（未来扩展）
├── worker/               # 后台任务处理
├── prisma/               # 数据库 Schema
└── infrastructure/       # 部署配置
```

## 技术栈

- **前端**: Next.js 15 (App Router), React 18, TypeScript
- **后端**: Next.js API Routes
- **数据库**: PostgreSQL + Prisma ORM
- **存储**: 本地文件系统 / Alibaba Cloud OSS
- **队列**: BullMQ + Redis (可选)
- **AI**: OpenAI / 硅基流动 / 通义千问
- **测试**: Vitest + Testing Library
- **监控**: Sentry (可选)

## 开发环境设置

### 前置要求

- Node.js >= 20.11.0
- pnpm >= 9.0.0
- PostgreSQL >= 14
- Redis (可选，用于队列和缓存)

### 安装步骤

1. **克隆仓库并安装依赖**:
```bash
git clone <repository>
cd linklore
pnpm install
```

2. **配置环境变量**:
复制 `.env.example` 到 `.env.local` 并填写：

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/linklore"

# 会话密钥
SESSION_SECRET="your-secret-key"

# AI 配置（可选）
AI_DEFAULT_PROVIDER="siliconflow"
AI_DEFAULT_MODEL="deepseek-chat"
AI_API_KEY="sk-..."

# OSS 配置（可选，不配置则使用本地存储）
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="..."
OSS_ACCESS_KEY_SECRET="..."
OSS_BUCKET="linklore"

# Redis（可选）
REDIS_URL="redis://127.0.0.1:6379"

# Sentry（可选）
NEXT_PUBLIC_SENTRY_DSN="..."
SENTRY_ORG="..."
SENTRY_PROJECT="..."
```

3. **初始化数据库**:
```bash
cd apps/web
pnpm prisma:generate
pnpm prisma:migrate
```

4. **启动开发服务器**:
```bash
pnpm dev
```

访问 `http://localhost:3000`

## 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 组件使用 PascalCase，文件使用 kebab-case

### 组件开发

**Server Components** (默认):
- 可以直接访问数据库
- 不能使用 hooks
- 不能使用浏览器 API

**Client Components** (`'use client'`):
- 可以使用 hooks
- 可以使用浏览器 API
- 需要从 Server Components 接收数据

### API 路由

所有 API 路由位于 `app/api/` 目录：

```typescript
// app/api/example/route.ts
import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';

export async function GET(req: Request) {
  const session = await readSession();
  if (!session?.sub) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  
  // 处理逻辑
  return NextResponse.json({ ok: true });
}
```

### 数据库操作

使用 Prisma Client:

```typescript
import { prisma } from '@/lib/db/client';

// 查询
const topics = await prisma.topic.findMany({
  where: { authorId: userId },
  include: { author: true },
  orderBy: { createdAt: 'desc' },
  take: 20
});

// 创建
const topic = await prisma.topic.create({
  data: {
    title: '标题',
    authorId: userId
  }
});
```

### 缓存使用

```typescript
import { getCache, setCache } from '@/lib/cache/redis';

// 获取缓存
const cached = await getCache<DataType>('cache:key');
if (cached) {
  return cached;
}

// 设置缓存（TTL 300 秒）
await setCache('cache:key', data, 300);
```

### 速率限制

速率限制在 middleware 中自动处理，无需手动配置。

### 审计日志

```typescript
import { logAudit } from '@/lib/audit/logger';

await logAudit({
  action: 'document.upload',
  userId: userId,
  resourceType: 'document',
  resourceId: documentId,
  metadata: { ... },
  ipAddress: req.headers.get('x-forwarded-for'),
  userAgent: req.headers.get('user-agent'),
});
```

## 测试

### 运行测试

```bash
cd apps/web
pnpm test              # 运行所有测试
pnpm test:ui           # 运行测试 UI
pnpm test:coverage     # 生成覆盖率报告
```

### 编写测试

```typescript
// __tests__/example.test.ts
import { describe, it, expect } from 'vitest';
import { functionToTest } from '@/lib/example';

describe('Example', () => {
  it('should work correctly', () => {
    expect(functionToTest()).toBe(expected);
  });
});
```

## 数据库迁移

### 创建迁移

修改 `prisma/schema.prisma` 后：

```bash
cd apps/web
pnpm prisma:migrate dev --name migration_name
```

### 应用迁移（生产环境）

```bash
pnpm prisma:migrate deploy
```

## 部署

### 构建

```bash
pnpm build
```

### 启动生产服务器

```bash
pnpm start
```

### Docker 部署

参考 `infrastructure/` 目录中的 Docker 配置。

## 常见问题

### 1. Prisma 生成失败

如果遇到文件锁定错误，关闭所有 Node.js 进程后重试。

### 2. Redis 连接失败

Redis 是可选的。如果未配置，系统会使用内存缓存作为降级方案。

### 3. OSS 上传失败

检查 OSS 配置是否正确，或使用本地存储模式（不配置 OSS 环境变量）。

### 4. AI 调用失败

检查 API Key 是否正确，或查看错误日志获取详细信息。

## 贡献指南

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

[添加许可证信息]










