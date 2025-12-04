# Redis 安装与配置指南（Windows）

本项目使用 Redis 作为任务队列的后端。以下是 Windows 上安装 Redis 的几种方法。

## 方法一：使用 Docker（推荐，最简单）

### 前置要求
- 安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)

### 步骤

1. **启动 Redis 容器**
   ```powershell
   # 在项目根目录下运行
   docker-compose up -d redis
   ```

2. **验证 Redis 是否运行**
   ```powershell
   # 检查容器状态
   docker ps
   
   # 测试 Redis 连接
   docker exec -it linklore-redis redis-cli ping
   # 应该返回: PONG
   ```

3. **停止 Redis（需要时）**
   ```powershell
   docker-compose down
   ```

4. **查看 Redis 日志**
   ```powershell
   docker-compose logs -f redis
   ```

### 优点
- ✅ 安装简单，一键启动
- ✅ 不污染系统环境
- ✅ 数据持久化（保存在 Docker volume 中）
- ✅ 自动重启

---

## 方法二：使用 WSL2（如果已安装）

### 前置要求
- 已安装 WSL2 和 Linux 发行版（如 Ubuntu）

### 步骤

1. **在 WSL2 中安装 Redis**
   ```bash
   # 进入 WSL2
   wsl
   
   # 更新包列表
   sudo apt update
   
   # 安装 Redis
   sudo apt install redis-server -y
   
   # 启动 Redis 服务
   sudo service redis-server start
   
   # 设置开机自启
   sudo systemctl enable redis-server
   ```

2. **验证 Redis 是否运行**
   ```bash
   redis-cli ping
   # 应该返回: PONG
   ```

3. **配置 Redis 监听所有接口（允许 Windows 访问）**
   ```bash
   # 编辑 Redis 配置文件
   sudo nano /etc/redis/redis.conf
   
   # 找到这一行并修改：
   # bind 127.0.0.1
   # 改为：
   bind 0.0.0.0
   
   # 保存后重启 Redis
   sudo service redis-server restart
   ```

4. **在 Windows 中测试连接**
   ```powershell
   # 使用 WSL2 的 IP 地址（通常是 127.0.0.1，因为端口已转发）
   # 或者使用 localhost
   ```

### 优点
- ✅ 原生 Linux 环境，性能好
- ✅ 适合长期开发

---

## 方法三：使用 Memurai（Windows 原生 Redis）

### 步骤

1. **下载 Memurai**
   - 访问 [Memurai 官网](https://www.memurai.com/)
   - 下载并安装 Memurai Developer Edition（免费）

2. **启动 Memurai**
   - 安装后，Memurai 会作为 Windows 服务自动启动
   - 默认端口：6379

3. **验证 Redis 是否运行**
   ```powershell
   # 使用 redis-cli（需要单独安装）或使用 Memurai 自带的工具
   # 或者直接测试连接
   ```

### 优点
- ✅ Windows 原生，无需 Docker 或 WSL
- ✅ 作为 Windows 服务运行

### 缺点
- ⚠️ 需要单独安装客户端工具（如 redis-cli）

---

## 方法四：使用云 Redis 服务（生产环境推荐）

### 可选服务
- **阿里云 Redis**：https://www.aliyun.com/product/redis
- **腾讯云 Redis**：https://cloud.tencent.com/product/redis
- **AWS ElastiCache**：https://aws.amazon.com/elasticache/
- **Redis Cloud**：https://redis.com/cloud/

### 配置步骤

1. **在云服务商创建 Redis 实例**
2. **获取连接信息**（主机、端口、密码等）
3. **更新环境变量**
   ```bash
   # apps/web/.env.local
   REDIS_URL=redis://:password@your-redis-host:6379
   ```

---

## 验证 Redis 连接

### 方法 1：使用 Docker（如果使用 Docker 方式）
```powershell
docker exec -it linklore-redis redis-cli ping
```

### 方法 2：使用 Node.js 测试脚本
创建 `test-redis.js`：
```javascript
const IORedis = require('ioredis');

const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

redis.ping()
  .then(() => {
    console.log('✅ Redis 连接成功！');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Redis 连接失败:', err.message);
    process.exit(1);
  });
```

运行：
```powershell
node test-redis.js
```

### 方法 3：启动 Worker 测试
```powershell
pnpm --filter @linklore/ai-queue dev
```

如果看到 `[Worker] Redis is available`，说明连接成功。

---

## 常见问题

### Q: Redis 连接被拒绝（ECONNREFUSED）
**A:** 检查 Redis 是否正在运行：
- Docker: `docker ps` 查看容器状态
- WSL2: `sudo service redis-server status`
- Memurai: 检查 Windows 服务是否运行

### Q: 端口 6379 已被占用
**A:** 
```powershell
# 查找占用端口的进程
netstat -ano | findstr :6379

# 结束进程（替换 PID 为实际进程 ID）
taskkill /PID <PID> /F
```

### Q: Docker 容器无法启动
**A:** 检查 Docker Desktop 是否运行，端口是否被占用。

### Q: 需要修改 Redis 配置
**A:** 
- Docker: 修改 `docker-compose.yml` 中的 `command` 参数
- WSL2: 编辑 `/etc/redis/redis.conf`
- Memurai: 使用 Memurai 配置工具

---

## 推荐方案

- **开发环境**：使用 Docker（方法一），最简单
- **生产环境**：使用云 Redis 服务（方法四），稳定可靠
- **不想用 Docker**：使用 WSL2（方法二）或 Memurai（方法三）

---

## 下一步

安装并启动 Redis 后：

1. **确认环境变量已配置**
   ```bash
   # apps/web/.env.local
   REDIS_URL="redis://127.0.0.1:6379"
   ```

2. **启动 Worker**
   ```powershell
   pnpm --filter @linklore/ai-queue dev
   ```

3. **验证连接**
   - 应该看到 `[Worker] Redis is available`
   - 不应该有连接错误








