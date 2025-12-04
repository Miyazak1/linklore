# LinkLore 安装指南（详细步骤）

## 第一步：检查 Node.js 版本

打开终端（Windows: PowerShell 或 CMD；macOS/Linux: Terminal），运行：

```bash
node --version
```

**要求**：版本必须是 `20.11.0` 或更高。

**如果没有 Node.js 或版本太低**：
- **Windows/macOS**: 访问 https://nodejs.org/ 下载 LTS 版本
- **或使用版本管理器**：
  - Windows: 使用 `nvm-windows` 或 `fnm`
  - macOS/Linux: 使用 `nvm` 或 `fnm`

---

## 第二步：启用 pnpm（包管理器）

### 方式 A：使用 corepack（推荐，无需全局安装）

Node.js 20+ 自带 corepack，只需启用：

```bash
# 启用 corepack
corepack enable

# 准备并激活 pnpm 9.0.0
corepack prepare pnpm@9.0.0 --activate
```

**验证**：
```bash
pnpm --version
```
应该显示 `9.0.0`

### 方式 B：全局安装 pnpm（如果方式 A 失败）

```bash
npm install -g pnpm@9.0.0
pnpm --version
```

---

## 第三步：进入项目目录并安装依赖

```bash
# 进入项目目录（假设你在项目根目录）
cd F:\SITE\linklore

# 安装所有依赖（这会花几分钟时间）
pnpm install
```

**说明**：
- 所有依赖会安装在项目目录下的 `node_modules` 文件夹中
- 不会污染你的全局环境
- 首次安装可能需要 2-5 分钟

**如果安装失败**：
- 检查网络连接
- 尝试使用国内镜像：`pnpm config set registry https://registry.npmmirror.com`
- 删除 `node_modules` 和 `pnpm-lock.yaml` 后重试

---

## 第四步：配置环境变量

### 4.1 创建环境变量文件

在 `apps/web/` 目录下创建 `.env.local` 文件。

**Windows PowerShell**：
```powershell
cd apps/web
@"
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/linklore
SESSION_SECRET=请替换为一个至少32字符的随机字符串
REDIS_URL=redis://127.0.0.1:6379
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=你的阿里云AccessKeyId
OSS_ACCESS_KEY_SECRET=你的阿里云AccessKeySecret
OSS_BUCKET=你的OSS桶名称
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

**Windows CMD**：
```cmd
cd apps\web
echo DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/linklore > .env.local
echo SESSION_SECRET=请替换为一个至少32字符的随机字符串 >> .env.local
echo REDIS_URL=redis://127.0.0.1:6379 >> .env.local
echo OSS_REGION=oss-cn-hangzhou >> .env.local
echo OSS_ACCESS_KEY_ID=你的阿里云AccessKeyId >> .env.local
echo OSS_ACCESS_KEY_SECRET=你的阿里云AccessKeySecret >> .env.local
echo OSS_BUCKET=你的OSS桶名称 >> .env.local
echo AI_DEFAULT_PROVIDER=openai >> .env.local
echo AI_ALLOWED_PROVIDERS=openai,qwen >> .env.local
echo AI_FALLBACK_PROVIDER=qwen >> .env.local
echo AI_MONTHLY_USER_CAP_CENTS=500 >> .env.local
echo AI_JOB_COST_LIMIT_CENTS=50 >> .env.local
echo QUEUE_CONCURRENCY=1 >> .env.local
echo MAX_FILE_SIZE_MB=20 >> .env.local
echo ALLOWED_EXT=doc,docx,txt,md >> .env.local
```

**macOS/Linux/Git Bash**：
```bash
cd apps/web
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres:你的密码@localhost:5432/linklore"
SESSION_SECRET="请替换为一个至少32字符的随机字符串"
REDIS_URL="redis://127.0.0.1:6379"
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="你的阿里云AccessKeyId"
OSS_ACCESS_KEY_SECRET="你的阿里云AccessKeySecret"
OSS_BUCKET="你的OSS桶名称"
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

**手动创建**（最简单）：
1. 打开 `apps/web/` 文件夹
2. 新建文件，命名为 `.env.local`（注意前面有个点）
3. 复制上面的内容，替换其中的占位符

### 4.2 必须配置的项

| 变量名 | 说明 | 如何获取 |
|--------|------|----------|
| `DATABASE_URL` | PostgreSQL 数据库连接 | 见下方“设置数据库” |
| `SESSION_SECRET` | 会话密钥 | 生成随机字符串（至少32字符） |
| `REDIS_URL` | Redis 连接地址 | 本地默认 `redis://127.0.0.1:6379` |
| `OSS_REGION` | 阿里云 OSS 区域 | 如 `oss-cn-hangzhou` |
| `OSS_ACCESS_KEY_ID` | 阿里云 AccessKey ID | 阿里云控制台 → 访问控制 → 用户 |
| `OSS_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret | 同上 |
| `OSS_BUCKET` | OSS 存储桶名称 | 阿里云 OSS 控制台创建 |

**生成 SESSION_SECRET**（在线工具或命令行）：
```bash
# Node.js 命令行
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 第五步：设置数据库

### 5.1 安装 PostgreSQL

**Windows**：
- 下载：https://www.postgresql.org/download/windows/
- 安装时记住你设置的 postgres 用户密码

**macOS**：
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian)**：
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 5.2 创建数据库

打开 PostgreSQL 命令行工具（Windows: pgAdmin 的 Query Tool 或 psql；macOS/Linux: `psql`）：

```sql
-- 连接到 PostgreSQL（可能需要输入密码）
-- Windows: 在 pgAdmin 中右键数据库 → Query Tool
-- 命令行: psql -U postgres

-- 创建数据库
CREATE DATABASE linklore;

-- 验证创建成功
\l
```

**或者使用命令行**：
```bash
# Windows (如果 psql 在 PATH 中)
psql -U postgres -c "CREATE DATABASE linklore;"

# macOS/Linux
createdb linklore
# 或
psql -U postgres -c "CREATE DATABASE linklore;"
```

### 5.3 更新环境变量中的 DATABASE_URL

在 `apps/web/.env.local` 中，将 `DATABASE_URL` 改为：
```
DATABASE_URL=postgresql://postgres:你的postgres密码@localhost:5432/linklore
```

---

## 第六步：安装 Redis（用于队列）

### Windows
- 下载：https://github.com/microsoftarchive/redis/releases
- 或使用 WSL：`wsl --install` 然后在 WSL 中安装 Redis
- 或使用 Docker：`docker run -d -p 6379:6379 redis`

### macOS
```bash
brew install redis
brew services start redis
```

### Linux
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**验证 Redis 运行**：
```bash
redis-cli ping
```
应该返回 `PONG`

---

## 第七步：生成 Prisma Client 并运行数据库迁移

```bash
# 回到项目根目录
cd F:\SITE\linklore

# 生成 Prisma Client（根据 schema.prisma 生成数据库访问代码）
pnpm prisma:generate

# 运行数据库迁移（创建所有表）
pnpm prisma:migrate
```

**如果迁移失败**：
- 检查 `DATABASE_URL` 是否正确
- 确认数据库 `linklore` 已创建
- 确认 PostgreSQL 服务正在运行

---

## 第八步：创建初始邀请码（用于注册）

在数据库中插入一个邀请码：

**使用 pgAdmin（Windows）**：
1. 打开 pgAdmin
2. 连接到服务器 → 展开 `linklore` 数据库 → 右键 `Invitation` 表 → View/Edit Data → Rows
3. 点击 "+" 添加一行：
   - `id`: 留空（会自动生成）
   - `code`: `INVITE-2025-TEST`
   - `createdAt`: 留空（会自动填充）
   - `expiresAt`: 留空或设置为未来30天
   - 其他字段留空
4. 保存

**使用 SQL**：
```sql
-- 连接到 linklore 数据库
\c linklore

-- 插入邀请码
INSERT INTO "Invitation" (id, code, "createdAt", "expiresAt")
VALUES (gen_random_uuid()::text, 'INVITE-2025-TEST', NOW(), NOW() + INTERVAL '30 days');
```

---

## 第九步：启动服务

### 9.1 启动 Web 应用（终端 1）

```bash
# 在项目根目录
cd F:\SITE\linklore

# 启动开发服务器
pnpm dev
```

应该看到类似输出：
```
▲ Next.js 15.0.0
- Local:        http://localhost:3000
```

### 9.2 启动队列 Worker（终端 2）

打开**另一个终端窗口**：

```bash
# 在项目根目录
cd F:\SITE\linklore

# 启动队列 Worker
pnpm --filter @linklore/ai-queue dev
```

应该看到类似输出：
```
[Worker] Starting...
[Worker] Listening for jobs...
```

---

## 第十步：访问应用

1. 打开浏览器访问：http://localhost:3000
2. 点击“注册”，使用邀请码 `INVITE-2025-TEST` 注册第一个用户
3. 登录后即可使用

---

## 常见问题排查

### 1. `pnpm: command not found`
- 确认已执行 `corepack enable` 或全局安装了 pnpm
- 重启终端后再试

### 2. 数据库连接失败
- 检查 PostgreSQL 服务是否运行：`pg_isready` 或查看服务状态
- 检查 `DATABASE_URL` 中的密码是否正确
- 检查防火墙是否阻止了 5432 端口

### 3. Redis 连接失败
- 检查 Redis 是否运行：`redis-cli ping`
- Windows: 确认 Redis 服务已启动
- 检查 `REDIS_URL` 是否正确

### 4. OSS 配置错误
- 确认阿里云 OSS 已开通
- 确认 AccessKey 有 OSS 权限
- 确认 Bucket 名称正确

### 5. 端口 3000 被占用
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <进程ID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill
```

---

## 安装完成检查清单

- [ ] Node.js >= 20.11.0 已安装
- [ ] pnpm 9.0.0 已启用
- [ ] `pnpm install` 成功完成
- [ ] `apps/web/.env.local` 已创建并配置
- [ ] PostgreSQL 已安装并创建了 `linklore` 数据库
- [ ] Redis 已安装并运行
- [ ] `pnpm prisma:generate` 成功
- [ ] `pnpm prisma:migrate` 成功
- [ ] 邀请码已创建
- [ ] Web 应用可以启动（`pnpm dev`）
- [ ] 队列 Worker 可以启动
- [ ] 浏览器可以访问 http://localhost:3000

---

## 下一步

安装完成后，查看 [README.md](./README.md) 了解如何使用和开发。










