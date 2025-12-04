# Redis 本地安装指南（最简单方案）

## 方案一：Windows 版 Redis（推荐，最简单）

### 步骤 1：下载 Redis

1. 访问：https://github.com/tporadowski/redis/releases
2. 下载最新版本的 `Redis-x64-xxx.zip`（例如：`Redis-x64-5.0.14.1.zip`）
3. 解压到 F 盘，例如：`F:\Redis`

### 步骤 2：启动 Redis

**方法 A：手动启动（开发时）**
1. 进入解压后的文件夹（例如：`F:\Redis`）
2. 双击运行 `redis-server.exe`
3. **保持这个窗口打开**，Redis 会一直运行

**方法 B：作为服务启动（推荐，开机自启）**
1. 以**管理员身份**打开 PowerShell
2. 进入 Redis 目录：
   ```powershell
   cd F:\Redis
   ```
3. 安装为 Windows 服务：
   ```powershell
   .\redis-server.exe --service-install redis.windows.conf --service-name Redis
   ```
4. 启动服务：
   ```powershell
   .\redis-server.exe --service-start --service-name Redis
   ```

### 步骤 3：验证 Redis 是否运行

打开新的 PowerShell 窗口：

```powershell
# 进入 Redis 目录
cd F:\Redis

# 测试连接
.\redis-cli.exe ping
```

应该返回：`PONG`

### 步骤 4：配置项目

确保 `apps/web/.env.local` 中有：

```env
REDIS_URL=redis://127.0.0.1:6379
```

### 步骤 5：测试项目连接

```powershell
# 在项目根目录
cd F:\SITE\linklore

# 启动 Worker 测试
pnpm --filter @linklore/ai-queue dev
```

如果看到 `[Worker] Redis is available`，说明成功！

---

## 方案二：使用 Docker Desktop（如果已安装）

如果你已经安装了 Docker Desktop：

```powershell
# 在项目根目录
cd F:\SITE\linklore

# 启动 Redis
docker-compose up -d

# 验证
docker ps
```

应该能看到 `linklore-redis` 容器在运行。

---

## 方案三：使用 Memurai（Windows 原生 Redis 替代品）

### 步骤 1：下载安装

1. 访问：https://www.memurai.com/get-memurai
2. 下载 **Memurai Developer Edition**（免费）
3. 运行安装程序，按默认选项安装

### 步骤 2：验证

安装后，Memurai 会自动作为 Windows 服务启动。

测试连接：
```powershell
# 如果安装了 redis-cli
redis-cli ping

# 或者使用 Node.js 测试（在项目目录）
node -e "const Redis = require('ioredis'); const r = new Redis('redis://127.0.0.1:6379'); r.ping().then(() => { console.log('✅ 连接成功'); process.exit(0); }).catch(e => { console.error('❌ 连接失败:', e.message); process.exit(1); });"
```

### 步骤 3：配置项目

确保 `apps/web/.env.local` 中有：

```env
REDIS_URL=redis://127.0.0.1:6379
```

---

## 推荐方案对比

| 方案 | 难度 | 优点 | 缺点 |
|------|------|------|------|
| **Windows 版 Redis** | ⭐ 简单 | 无需安装其他软件，直接运行 | 需要手动启动（或配置服务） |
| **Docker Desktop** | ⭐⭐ 中等 | 一键启动，数据持久化 | 需要安装 Docker Desktop |
| **Memurai** | ⭐ 简单 | 自动启动，作为服务运行 | 需要单独下载安装 |

---

## 快速检查清单

- [ ] Redis 已下载并解压（或 Docker/Memurai 已安装）
- [ ] Redis 正在运行（`redis-cli ping` 返回 `PONG`）
- [ ] `apps/web/.env.local` 中配置了 `REDIS_URL=redis://127.0.0.1:6379`
- [ ] 启动 Worker 测试：`pnpm --filter @linklore/ai-queue dev`
- [ ] 看到 `[Worker] Redis is available` 消息

---

## 常见问题

### Q: Redis 启动后窗口关闭了怎么办？

**A:** 使用服务方式启动（方案一的方法 B），或者每次开发时手动运行 `redis-server.exe`。

### Q: 端口 6379 被占用？

**A:** 
```powershell
# 查看谁占用了端口
netstat -ano | findstr :6379

# 结束进程（替换 <PID> 为实际进程ID）
taskkill /PID <PID> /F
```

### Q: 如何停止 Redis？

**A:** 
- 手动启动的：直接关闭窗口
- 服务方式：在服务管理器中停止 "Redis" 服务
- Docker：`docker-compose down`

### Q: 如何确认 Redis 在运行？

**A:** 
```powershell
# 方法 1：使用 redis-cli
cd F:\Redis
.\redis-cli.exe ping
# 应该返回 PONG

# 方法 2：查看进程
tasklist | findstr redis-server

# 方法 3：启动 Worker 测试
pnpm --filter @linklore/ai-queue dev
```

---

## 下一步

Redis 运行后，继续项目开发：

```powershell
# 窗口 1：启动 Web 应用
pnpm dev

# 窗口 2：启动队列 Worker
pnpm --filter @linklore/ai-queue dev
```

