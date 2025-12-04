# Windows 安装指南（详细步骤）

## 使用哪个终端？

**推荐顺序**：
1. **PowerShell**（Windows 10/11 自带，推荐）
2. **CMD**（传统命令行，也可以）
3. **Git Bash**（如果安装了 Git，也可以）

**如何打开**：
- **PowerShell**: 按 `Win + X`，选择"Windows PowerShell"或"终端"
- **CMD**: 按 `Win + R`，输入 `cmd`，回车
- **Git Bash**: 右键项目文件夹 → "Git Bash Here"

---

## 在哪个文件夹执行命令？

**所有命令都在项目根目录执行**：`F:\SITE\linklore`

---

## 完整安装步骤（Windows）

### 步骤 1：打开 PowerShell 并进入项目目录

1. 按 `Win + X`，选择"Windows PowerShell"
2. 输入以下命令进入项目目录：

```powershell
cd F:\SITE\linklore
```

**验证**：应该看到提示符显示路径，例如：
```
PS F:\SITE\linklore>
```

---

### 步骤 2：检查 Node.js

在 PowerShell 中输入：

```powershell
node --version
```

**要求**：必须显示 `v20.11.0` 或更高版本

**如果没有 Node.js**：
- 访问 https://nodejs.org/ 下载 Windows 安装包
- 安装时选择"Add to PATH"
- 安装完成后**重启 PowerShell**，再检查版本

---

### 步骤 3：启用 pnpm

在 PowerShell 中执行：

```powershell
# 启用 corepack
corepack enable

# 准备并激活 pnpm
corepack prepare pnpm@9.0.0 --activate

# 验证安装
pnpm --version
```

应该显示 `9.0.0`

**如果 `corepack` 命令不存在**：
```powershell
# 使用 npm 全局安装 pnpm
npm install -g pnpm@9.0.0
pnpm --version
```

---

### 步骤 4：安装项目依赖

**确保在项目根目录**（`F:\SITE\linklore`）：

```powershell
# 确认当前位置
pwd
# 应该显示：F:\SITE\linklore

# 安装依赖（需要几分钟）
pnpm install
```

**说明**：
- 依赖会安装在 `F:\SITE\linklore\node_modules` 文件夹中
- 不会安装到系统其他地方
- 首次安装可能需要 2-5 分钟

**如果安装很慢**，可以使用国内镜像：
```powershell
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

---

### 步骤 5：创建环境变量文件

**在 PowerShell 中执行**：

```powershell
# 进入 apps/web 目录
cd apps\web

# 创建 .env.local 文件
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

# 返回项目根目录
cd ..\..
```

**或者手动创建**：
1. 打开文件管理器，进入 `F:\SITE\linklore\apps\web\`
2. 新建文件，命名为 `.env.local`（注意前面有个点）
3. 用记事本打开，复制上面的内容，替换占位符，保存

**生成 SESSION_SECRET**（在 PowerShell 中）：
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
复制输出的字符串，替换 `.env.local` 中的 `SESSION_SECRET`

---

### 步骤 6：安装 PostgreSQL

1. 下载：https://www.postgresql.org/download/windows/
2. 运行安装程序
3. **记住你设置的 postgres 用户密码**（后面配置 DATABASE_URL 要用）

**创建数据库**（使用 pgAdmin）：
1. 打开 pgAdmin（安装 PostgreSQL 时一起安装的）
2. 连接到服务器（输入安装时设置的密码）
3. 右键 "Databases" → "Create" → "Database"
4. 名称填 `linklore`，点击保存

**或者用命令行**（在 PowerShell 中）：
```powershell
# 如果 psql 在 PATH 中
psql -U postgres -c "CREATE DATABASE linklore;"
```

---

### 步骤 7：安装 Redis

**方式 A：使用 WSL（推荐）**
```powershell
# 安装 WSL
wsl --install
# 重启电脑后，在 WSL 中安装 Redis
wsl
sudo apt update
sudo apt install redis-server
redis-server --daemonize yes
exit
```

**方式 B：下载 Windows 版本**
- 下载：https://github.com/microsoftarchive/redis/releases
- 解压后运行 `redis-server.exe`

**方式 C：使用 Docker（如果已安装 Docker）**
```powershell
docker run -d -p 6379:6379 redis
```

---

### 步骤 8：运行数据库迁移

**在项目根目录**（`F:\SITE\linklore`）执行：

```powershell
# 确保在项目根目录
cd F:\SITE\linklore

# 生成 Prisma Client
pnpm prisma:generate

# 运行数据库迁移（创建所有表）
pnpm prisma:migrate
```

---

### 步骤 9：创建邀请码

**使用 pgAdmin**：
1. 打开 pgAdmin
2. 连接到 `linklore` 数据库
3. 展开 "Schemas" → "public" → "Tables"
4. 右键 "Invitation" 表 → "View/Edit Data" → "All Rows"
5. 点击 "+" 添加一行：
   - `code`: `INVITE-2025-TEST`
   - 其他字段留空（会自动填充）
6. 点击保存

**或者用 SQL**（在 pgAdmin 的 Query Tool 中）：
```sql
INSERT INTO "Invitation" (id, code, "createdAt", "expiresAt")
VALUES (gen_random_uuid()::text, 'INVITE-2025-TEST', NOW(), NOW() + INTERVAL '30 days');
```

---

### 步骤 10：启动服务

**需要打开两个 PowerShell 窗口**

**窗口 1：启动 Web 应用**
```powershell
# 进入项目根目录
cd F:\SITE\linklore

# 启动开发服务器
pnpm dev
```

应该看到：
```
▲ Next.js 15.0.0
- Local:        http://localhost:3000
```

**窗口 2：启动队列 Worker**
```powershell
# 进入项目根目录
cd F:\SITE\linklore

# 启动队列 Worker
pnpm --filter @linklore/ai-queue dev
```

应该看到：
```
[Worker] Starting...
[Worker] Listening for jobs...
```

---

### 步骤 11：访问应用

打开浏览器，访问：http://localhost:3000

使用邀请码 `INVITE-2025-TEST` 注册第一个用户。

---

## 重要提示

### 所有命令都在项目根目录执行

**项目根目录**：`F:\SITE\linklore`

**如何确认当前位置**：
```powershell
# PowerShell
pwd

# CMD
cd
```

**如果不在项目根目录**：
```powershell
cd F:\SITE\linklore
```

### 文件夹结构

```
F:\SITE\linklore\          ← 项目根目录（所有命令在这里执行）
├── node_modules\          ← 依赖安装在这里
├── apps\
│   └── web\
│       └── .env.local     ← 环境变量文件在这里
├── packages\
├── worker\
└── package.json
```

---

## 如果使用 CMD 而不是 PowerShell

**CMD 的命令稍有不同**：

```cmd
REM 进入项目目录
cd /d F:\SITE\linklore

REM 启用 pnpm
corepack enable
corepack prepare pnpm@9.0.0 --activate

REM 安装依赖
pnpm install

REM 创建环境变量文件（需要手动创建或使用其他方法）
REM 建议用记事本手动创建 apps\web\.env.local
```

**创建 .env.local 文件（CMD）**：
```cmd
cd apps\web
(
echo DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/linklore
echo SESSION_SECRET=请替换为一个至少32字符的随机字符串
echo REDIS_URL=redis://127.0.0.1:6379
echo OSS_REGION=oss-cn-hangzhou
echo OSS_ACCESS_KEY_ID=你的阿里云AccessKeyId
echo OSS_ACCESS_KEY_SECRET=你的阿里云AccessKeySecret
echo OSS_BUCKET=你的OSS桶名称
echo AI_DEFAULT_PROVIDER=openai
echo AI_ALLOWED_PROVIDERS=openai,qwen
echo AI_FALLBACK_PROVIDER=qwen
echo AI_MONTHLY_USER_CAP_CENTS=500
echo AI_JOB_COST_LIMIT_CENTS=50
echo QUEUE_CONCURRENCY=1
echo MAX_FILE_SIZE_MB=20
echo ALLOWED_EXT=doc,docx,txt,md
) > .env.local
```

---

## 快速检查清单

- [ ] 打开 PowerShell（或 CMD）
- [ ] 进入项目目录：`cd F:\SITE\linklore`
- [ ] 检查 Node.js：`node --version`
- [ ] 启用 pnpm：`corepack enable`
- [ ] 安装依赖：`pnpm install`
- [ ] 创建环境变量文件：`apps\web\.env.local`
- [ ] 安装 PostgreSQL 并创建数据库
- [ ] 安装 Redis
- [ ] 运行迁移：`pnpm prisma:migrate`
- [ ] 创建邀请码
- [ ] 启动服务：`pnpm dev`（窗口1）和 `pnpm --filter @linklore/ai-queue dev`（窗口2）

---

## 遇到问题？

1. **命令找不到**：确认在项目根目录 `F:\SITE\linklore`
2. **权限错误**：右键 PowerShell → "以管理员身份运行"
3. **端口被占用**：关闭占用 3000 端口的程序
4. **数据库连接失败**：检查 PostgreSQL 服务是否运行，密码是否正确










