# Docker Redis 安装指南（官方推荐方案）

按照 [Redis 官方文档](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/) 的推荐方式安装。

## 前置要求

- 已安装 **Docker Desktop for Windows**
- Docker Desktop 已启动（任务栏有鲸鱼图标）

## 快速开始

### 步骤 1：启动 Redis 容器

在项目根目录（`F:\SITE\linklore`）执行：

```powershell
docker-compose up -d
```

**期望输出**：
```
[+] Running 2/2
 ✔ Network linklore_default      Created
 ✔ Container linklore-redis      Started
```

### 步骤 2：验证 Redis 是否运行

```powershell
# 查看容器状态
docker ps
```

应该能看到 `linklore-redis` 容器在运行。

### 步骤 3：测试 Redis 连接

**方法 1：使用 Docker 容器内的 redis-cli（推荐）**

```powershell
docker exec -it linklore-redis redis-cli ping
```

应该返回：`PONG`

**方法 2：如果本地安装了 redis-cli**

```powershell
redis-cli -h 127.0.0.1 -p 6379 ping
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

**期望输出**：
```
[Worker] Redis is available
[Worker] Redis connected
[Worker] Workers registered successfully
```

**不应该看到**：
- ❌ `maxRetriesPerRequest must be null` 错误
- ❌ `Cannot read properties of undefined` 错误
- ❌ Redis 版本警告（应该使用 Redis 7）

---

## 常用命令

### 启动 Redis

```powershell
docker-compose up -d
```

### 停止 Redis

```powershell
docker-compose down
```

### 查看 Redis 日志

```powershell
docker-compose logs -f redis
```

### 重启 Redis

```powershell
docker-compose restart redis
```

### 进入 Redis 容器

```powershell
docker exec -it linklore-redis sh
```

### 使用 redis-cli 操作

```powershell
# 进入交互式 redis-cli
docker exec -it linklore-redis redis-cli

# 执行单个命令
docker exec -it linklore-redis redis-cli ping
docker exec -it linklore-redis redis-cli keys "*"
docker exec -it linklore-redis redis-cli flushall
```

---

## 数据持久化

Redis 数据会保存在 Docker volume `redis-data` 中，即使容器重启，数据也不会丢失。

### 查看数据卷

```powershell
docker volume ls
docker volume inspect linklore_redis-data
```

### 备份数据

```powershell
# 导出数据
docker exec linklore-redis redis-cli --rdb /data/dump.rdb

# 复制到本地
docker cp linklore-redis:/data/dump.rdb ./redis-backup.rdb
```

---

## 常见问题

### Q1: Docker Desktop 没有启动

**错误信息**：
```
error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/containers/json": 
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

**解决方案**：
1. 启动 Docker Desktop（按 `Win` 键，搜索 "Docker Desktop"）
2. 等待 Docker Desktop 完全启动（任务栏图标不再动画）
3. 重新运行 `docker-compose up -d`

### Q2: 端口 6379 被占用

**错误信息**：
```
Error response from daemon: driver failed programming external connectivity on endpoint linklore-redis: 
Error starting userland proxy: listen tcp4 0.0.0.0:6379: bind: address already in use
```

**解决方案**：

**方法 1：停止占用端口的程序**
```powershell
# 查找占用端口的进程
netstat -ano | findstr :6379

# 结束进程（替换 <PID> 为实际进程ID）
taskkill /PID <PID> /F
```

**方法 2：修改 docker-compose.yml 使用其他端口**
```yaml
ports:
  - "6380:6379"  # 改为 6380
```

然后更新 `.env.local`：
```env
REDIS_URL=redis://127.0.0.1:6380
```

### Q3: 容器无法启动

**查看详细日志**：
```powershell
docker-compose logs redis
```

**重新创建容器**：
```powershell
docker-compose down
docker-compose up -d
```

### Q4: Redis 版本问题

**错误信息**：
```
It is highly recommended to use a minimum Redis version of 6.2.0
Current: 5.0.14.1
```

**解决方案**：
使用 Docker 方案，会自动使用 Redis 7（最新版本）。

### Q5: BullMQ 配置错误

**错误信息**：
```
BullMQ: Your redis options maxRetriesPerRequest must be null
```

**解决方案**：
代码已修复，`maxRetriesPerRequest` 已设置为 `null`。如果还有问题，重启 Worker：
```powershell
# 停止 Worker（Ctrl+C）
# 重新启动
pnpm --filter @linklore/ai-queue dev
```

---

## 与官方文档的对应

根据 [Redis 官方文档](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/)，我们的配置：

```yaml
# 官方推荐命令：
docker run -d --name redis -p 6379:6379 redis:7

# 我们的 docker-compose.yml 等效于：
services:
  redis:
    image: redis:7
    container_name: linklore-redis
    ports:
      - "6379:6379"
    # 额外配置：数据持久化、健康检查、自动重启
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
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

---

## 参考链接

- [Redis 官方 Docker 文档](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/)
- [Docker Compose 文档](https://docs.docker.com/compose/)




