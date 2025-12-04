# 本地运行配置指南

## 已完成的配置

✅ 已创建本地存储方案，无需阿里云 OSS 即可运行
✅ 文件会保存在项目目录下的 `uploads/` 文件夹中

---

## 更新环境变量文件

打开 `apps/web/.env.local`，**删除或注释掉 OSS 相关配置**：

```env
DATABASE_URL=postgresql://postgres:Nuan2230543@localhost:5432/linklore
SESSION_SECRET=41cd3afb753decb61f8bd1c72712e8cff738fbe3e36b687b55b550cb5e41d7c0
REDIS_URL=redis://127.0.0.1:6379

# OSS 配置（本地运行不需要，已注释）
# OSS_REGION=oss-cn-hangzhou
# OSS_ACCESS_KEY_ID=你的阿里云AccessKeyId
# OSS_ACCESS_KEY_SECRET=你的阿里云AccessKeySecret
# OSS_BUCKET=你的OSS桶名称

AI_DEFAULT_PROVIDER=openai
AI_ALLOWED_PROVIDERS=openai,qwen
AI_FALLBACK_PROVIDER=qwen
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50
QUEUE_CONCURRENCY=1
MAX_FILE_SIZE_MB=20
ALLOWED_EXT=doc,docx,txt,md
```

**或者直接删除这三行**：
- `OSS_REGION=...`
- `OSS_ACCESS_KEY_ID=...`
- `OSS_ACCESS_KEY_SECRET=...`
- `OSS_BUCKET=...`

---

## 安装 PostgreSQL（如果还没有）

### Windows 安装步骤：

1. **下载 PostgreSQL**
   - 访问：https://www.postgresql.org/download/windows/
   - 下载安装程序（推荐版本 15 或 16）

2. **安装**
   - 运行安装程序
   - 记住你设置的 **postgres 用户密码**（你已经在 `.env.local` 中配置为 `Nuan2230543`）
   - 端口保持默认 `5432`
   - 其他选项保持默认即可

3. **验证安装**
   ```powershell
   # 检查服务是否运行
   Get-Service -Name postgresql*
   
   # 尝试连接（会提示输入密码，输入：Nuan2230543）
   psql -U postgres
   ```

---

## 安装 Redis（如果还没有）

### Windows 安装方式：

**方式 1：使用 WSL（推荐）**
```powershell
# 安装 WSL（如果还没有）
wsl --install
# 重启电脑后，在 WSL 中安装 Redis
wsl
sudo apt update
sudo apt install redis-server
redis-server --daemonize yes
exit
```

**方式 2：下载 Windows 版本**
- 下载：https://github.com/microsoftarchive/redis/releases
- 解压后运行 `redis-server.exe`

**方式 3：使用 Docker（如果已安装 Docker）**
```powershell
docker run -d -p 6379:6379 redis
```

**验证 Redis**
```powershell
redis-cli ping
# 应该返回：PONG
```

---

## 创建数据库

在 PowerShell 中执行：

```powershell
# 创建数据库（会提示输入密码：Nuan2230543）
psql -U postgres -c "CREATE DATABASE linklore;"
```

如果数据库已存在，会提示错误，可以忽略。

---

## 运行数据库迁移

```powershell
# 确保在项目根目录
cd F:\SITE\linklore

# 生成 Prisma Client
pnpm prisma:generate

# 运行数据库迁移（创建所有表）
pnpm prisma:migrate
```

---

## 创建邀请码

**使用 pgAdmin（图形界面）**：
1. 打开 pgAdmin（安装 PostgreSQL 时一起安装的）
2. 连接到服务器（输入密码：`Nuan2230543`）
3. 展开 `linklore` 数据库 → `Schemas` → `public` → `Tables`
4. 右键 `Invitation` 表 → `View/Edit Data` → `All Rows`
5. 点击 `+` 添加一行：
   - `code`: `INVITE-2025-TEST`
   - 其他字段留空（会自动填充）
6. 点击保存

**或使用 SQL**（在 pgAdmin 的 Query Tool 中）：
```sql
INSERT INTO "Invitation" (id, code, "createdAt", "expiresAt")
VALUES (gen_random_uuid()::text, 'INVITE-2025-TEST', NOW(), NOW() + INTERVAL '30 days');
```

---

## 启动服务

### 需要打开两个 PowerShell 窗口

**窗口 1：启动 Web 应用**
```powershell
cd F:\SITE\linklore
pnpm dev
```

应该看到：
```
▲ Next.js 15.0.0
- Local:        http://localhost:3000
```

**窗口 2：启动队列 Worker**
```powershell
cd F:\SITE\linklore
pnpm --filter @linklore/ai-queue dev
```

应该看到：
```
[Worker] Starting...
[Worker] Listening for jobs...
```

---

## 访问应用

1. 打开浏览器访问：http://localhost:3000
2. 点击"注册"
3. 使用邀请码：`INVITE-2025-TEST`
4. 注册并登录后即可使用

---

## 本地存储说明

- **文件存储位置**：`F:\SITE\linklore\uploads\` 文件夹
- **文件访问**：通过 `/api/files/[key]` API 路由访问
- **无需配置 OSS**：所有文件保存在本地

---

## 常见问题

### 1. PostgreSQL 连接失败
- 检查服务是否运行：`Get-Service -Name postgresql*`
- 确认密码是否正确（`.env.local` 中的 `Nuan2230543`）
- 检查防火墙是否阻止了 5432 端口

### 2. Redis 连接失败
- 检查 Redis 是否运行：`redis-cli ping`
- Windows: 确认 Redis 服务已启动
- WSL: 确认 `redis-server` 在后台运行

### 3. 端口 3000 被占用
```powershell
# 查找占用端口的进程
netstat -ano | findstr :3000
# 结束进程（替换 <PID> 为实际进程ID）
taskkill /PID <PID> /F
```

### 4. 文件上传失败
- 检查 `uploads/` 文件夹是否有写入权限
- 确认文件大小不超过 20MB
- 确认文件类型是 doc, docx, txt, md

---

## 完成检查清单

- [ ] PostgreSQL 已安装并运行
- [ ] Redis 已安装并运行
- [ ] 数据库 `linklore` 已创建
- [ ] `.env.local` 已配置（OSS 配置已删除/注释）
- [ ] `pnpm prisma:migrate` 成功运行
- [ ] 邀请码已创建
- [ ] Web 应用可以启动（`pnpm dev`）
- [ ] 队列 Worker 可以启动
- [ ] 浏览器可以访问 http://localhost:3000

完成以上步骤后，你就可以在本地运行 LinkLore 了！










