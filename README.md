# LinkLore — 本地运行指南

## 前置要求

- **Node.js**: >= 20.11.0（推荐使用 nvm 或 fnm 管理）
- **包管理器**: pnpm 9.0.0
  - **方式 A（推荐）**：使用 Node.js 自带的 corepack（无需全局安装）
    ```bash
    corepack enable
    corepack prepare pnpm@9.0.0 --activate
    ```
  - **方式 B**：全局安装 `npm install -g pnpm@9.0.0`
- **PostgreSQL**: 本地安装或使用云数据库（RDS）
- **Redis**: 本地安装或使用云 Redis（用于队列）
- **LibreOffice**: 仅当需要处理 `.doc` 文件时（Windows: 下载安装；macOS: `brew install libreoffice`；Linux: `sudo apt install libreoffice`）

**注意**：所有依赖都会安装在项目目录下的 `node_modules` 中，不会污染全局环境。

## 快速开始

### 1. 启用 pnpm 并安装依赖

**首次使用（启用 corepack）：**
```bash
# Node.js 20+ 自带 corepack，只需启用即可
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

**安装依赖（所有依赖会安装在项目目录下的 node_modules）：**
```bash
cd linklore
pnpm install
```

**验证安装：**
```bash
# 检查 pnpm 版本
pnpm --version  # 应该显示 9.0.0

# 检查依赖是否已安装
ls node_modules  # 应该能看到依赖包
```

### 2. 配置环境变量

在 `apps/web/` 目录下创建 `.env.local` 文件：

**Linux/macOS/Git Bash:**
```bash
cd apps/web
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres:password@localhost:5432/linklore"
SESSION_SECRET="your-random-secret-key-at-least-32-chars"
REDIS_URL="redis://127.0.0.1:6379"
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="your-access-key-id"
OSS_ACCESS_KEY_SECRET="your-access-key-secret"
OSS_BUCKET="your-bucket-name"
AI_DEFAULT_PROVIDER="openai"
AI_ALLOWED_PROVIDERS="openai,qwen"
AI_FALLBACK_PROVIDER="qwen"
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50
QUEUE_CONCURRENCY=1
MAX_FILE_SIZE_MB=20
ALLOWED_EXT="doc,docx,txt,md"
EOF
```

**Windows PowerShell:**
```powershell
cd apps/web
@"
DATABASE_URL=postgresql://postgres:password@localhost:5432/linklore
SESSION_SECRET=your-random-secret-key-at-least-32-chars
REDIS_URL=redis://127.0.0.1:6379
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket-name
AI_DEFAULT_PROVIDER=openai
AI_ALLOWED_PROVIDERS=openai,qwen
AI_FALLBACK_PROVIDER=qwen
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50
QUEUE_CONCURRENCY=1
MAX_FILE_SIZE_MB=20
ALLOWED_EXT=doc,docx,txt,md
"@ | Out-File -FilePath .env.local -Encoding utf8
```

**手动创建**：也可以直接在 `apps/web/.env.local` 文件中复制粘贴上述内容，并替换为你的实际配置值。

**注意**：队列 Worker 会读取相同的环境变量（通过 monorepo 共享），如果单独运行 Worker，可在 `worker/ai-queue/` 目录下也创建 `.env.local`。

### 3. 设置数据库

确保 PostgreSQL 已启动，并创建数据库：

```bash
# 使用 psql 或数据库管理工具
createdb linklore
# 或
psql -U postgres -c "CREATE DATABASE linklore;"
```

### 4. 生成 Prisma Client 并运行迁移

```bash
# 生成 Prisma Client
pnpm prisma:generate

# 运行数据库迁移（创建表结构）
pnpm prisma:migrate
```

### 5. 创建初始邀请码（可选）

在数据库中手动插入一个邀请码，用于注册第一个用户：

```sql
INSERT INTO "Invitation" (id, code, "createdAt", "expiresAt")
VALUES ('clxxx', 'INVITE-2025-TEST', NOW(), NOW() + INTERVAL '30 days');
```

### 6. 启动服务

**方式 A：开发模式（推荐）**

```bash
# 终端 1：启动 Web 应用（Next.js 开发服务器）
pnpm dev

# 终端 2：启动队列 Worker（处理文档提取等任务）
pnpm --filter @linklore/ai-queue dev
```

**方式 B：生产模式**

```bash
# 构建所有包
pnpm build

# 启动 Web 应用
pnpm start

# 启动队列 Worker（需要先构建）
cd worker/ai-queue
pnpm build
pnpm start
```

### 7. 访问应用

- Web 应用: http://localhost:3000
- 健康检查: http://localhost:3000/api/health

## 环境变量说明

### Web 应用（`apps/web/.env.local`）

```bash
# 数据库（必需）
DATABASE_URL="postgresql://user:password@localhost:5432/linklore"

# 会话密钥（必需，用于 JWT 签名）
SESSION_SECRET="your-random-secret-key-at-least-32-chars"

# Redis（必需，用于队列）
REDIS_URL="redis://127.0.0.1:6379"

# 阿里云 OSS（必需，用于文件存储）
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="your-access-key-id"
OSS_ACCESS_KEY_SECRET="your-access-key-secret"
OSS_BUCKET="your-bucket-name"

# AI 配置（可选，用于默认 AI 提供商）
AI_DEFAULT_PROVIDER="openai"
AI_ALLOWED_PROVIDERS="openai,qwen"
AI_FALLBACK_PROVIDER="qwen"
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50

# 队列并发（可选）
QUEUE_CONCURRENCY=1

# 文件大小限制（可选）
MAX_FILE_SIZE_MB=20
ALLOWED_EXT="doc,docx,txt,md"
```

### 队列 Worker（`worker/ai-queue/.env.local`）

```bash
# 数据库（必需，与 Web 应用相同）
DATABASE_URL="postgresql://user:password@localhost:5432/linklore"

# Redis（必需，与 Web 应用相同）
REDIS_URL="redis://127.0.0.1:6379"

# 队列并发（可选）
QUEUE_CONCURRENCY=1
```

## 本地开发常见问题

### Redis 连接失败

确保 Redis 已启动：

**Windows（推荐使用 Docker）：**
```powershell
# 在项目根目录下运行
docker-compose up -d redis

# 验证 Redis 是否运行
docker exec -it linklore-redis redis-cli ping
```

**其他方法：**
- macOS (Homebrew): `brew services start redis`
- Linux (systemd): `sudo systemctl start redis`
- WSL2: `sudo service redis-server start`
- 详细安装指南请查看 [docs/REDIS_SETUP.md](./docs/REDIS_SETUP.md)

### Prisma 迁移失败

如果迁移报错，可以重置数据库（**注意：会删除所有数据**）：

```bash
pnpm --filter @linklore/web prisma migrate reset
```

### LibreOffice 未找到

如果只处理 `.docx`、`.txt`、`.md` 文件，可以暂时不安装 LibreOffice。处理 `.doc` 文件时会报错，但不影响其他功能。

### OSS 配置问题

如果暂时没有阿里云 OSS，可以：
1. 注册阿里云账号并开通 OSS
2. 创建 Bucket 并获取 AccessKey
3. 或使用 MinIO 本地模拟（需要额外配置）

## 下一步

- 查看 [CHANGES_AI.md](./CHANGES_AI.md) 了解变更历史
- 查看 `infrastructure/` 目录了解生产部署配置
- 查看 API 文档（待补充）了解接口规范

