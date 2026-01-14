# Mooyu Docker 部署指南

## 📋 前置要求

- Docker >= 20.10
- Docker Compose >= 2.0
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Miyazak1/linklore.git
cd linklore
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
cp .env.example .env  # 如果存在
# 或手动创建
```

编辑 `.env` 文件，配置以下变量：

```env
# 会话密钥（必须修改为随机字符串，至少 32 字符）
SESSION_SECRET=your-random-secret-key-at-least-32-chars

# 应用 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OSS 配置（如果使用文件上传）
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket-name

# AI 配置
AI_DEFAULT_PROVIDER=openai
AI_ALLOWED_PROVIDERS=openai,qwen
AI_FALLBACK_PROVIDER=qwen
```

**注意**: 数据库和 Redis 的配置已在 `docker-compose.yml` 中设置，无需在 `.env` 中配置。

### 3. 部署

#### 方法 A: 使用部署脚本（推荐）

```bash
chmod +x docker-deploy.sh
./docker-deploy.sh
```

#### 方法 B: 手动部署

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

### 4. 初始化数据库

```bash
# 进入 web 容器
docker-compose exec web sh

# 在容器内执行
pnpm prisma db push
# 或
pnpm prisma migrate deploy

# 退出容器
exit
```

## 🔧 生产环境部署

### 使用生产配置

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

生产配置包括：
- 资源限制（CPU、内存）
- 日志轮转
- 移除端口映射（通过 Nginx 反向代理）

### Nginx 反向代理配置

创建 `/etc/nginx/sites-available/mooyu`:

```nginx
server {
    listen 80;
    server_name www.mooyu.fun mooyu.fun;

    # 重定向到 HTTPS（如果使用 SSL）
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Next.js 静态资源
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**注意**: 如果使用生产模式，需要修改 `docker-compose.prod.yml` 中的端口映射，或使用 Docker 网络。

## 📦 服务说明

### Web 应用 (mooyu-web)

- **端口**: 3000
- **健康检查**: `http://localhost:3000/api/health`
- **日志**: `docker-compose logs -f web`

### PostgreSQL (mooyu-postgres)

- **端口**: 5432
- **数据库**: mooyu
- **用户**: mooyu
- **密码**: fdn4jjKXGZ56LJLh（可在 docker-compose.yml 中修改）
- **数据持久化**: `postgres-data` volume

### Redis (mooyu-redis)

- **端口**: 6379
- **数据持久化**: `redis-data` volume
- **AOF**: 已启用

## 🛠️ 常用命令

### 查看日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f web
docker-compose logs -f postgres
docker-compose logs -f redis
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart web
```

### 停止服务

```bash
# 停止并删除容器
docker-compose down

# 停止并删除容器、卷（⚠️ 会删除数据）
docker-compose down -v
```

### 进入容器

```bash
# 进入 web 容器
docker-compose exec web sh

# 进入 postgres 容器
docker-compose exec postgres psql -U mooyu -d mooyu
```

### 数据库操作

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U mooyu mooyu > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U mooyu mooyu < backup.sql

# 运行 Prisma 迁移
docker-compose exec web pnpm prisma migrate deploy
```

### 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 运行数据库迁移（如果需要）
docker-compose exec web pnpm prisma migrate deploy
```

## 🔍 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs web

# 检查容器状态
docker-compose ps

# 检查资源使用
docker stats
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
docker-compose ps postgres

# 测试数据库连接
docker-compose exec postgres psql -U mooyu -d mooyu -c "SELECT 1;"
```

### 静态资源 404

确保构建时正确复制了 static 和 public 文件。检查 Dockerfile 中的复制步骤。

### 内存不足

如果遇到内存不足，可以：
1. 增加 Docker 内存限制
2. 调整 `docker-compose.prod.yml` 中的资源限制
3. 只运行必要的服务

## 📝 环境变量说明

### 必需变量

- `SESSION_SECRET`: JWT 签名密钥（至少 32 字符）
- `DATABASE_URL`: 数据库连接字符串（已在 docker-compose.yml 中配置）
- `REDIS_URL`: Redis 连接字符串（已在 docker-compose.yml 中配置）

### 可选变量

- `NEXT_PUBLIC_APP_URL`: 应用公开 URL（用于 Server Actions）
- `OSS_*`: 阿里云 OSS 配置（如果使用文件上传）
- `AI_*`: AI 服务配置
- `QUEUE_CONCURRENCY`: 队列并发数
- `MAX_FILE_SIZE_MB`: 最大文件大小（MB）
- `ALLOWED_EXT`: 允许的文件扩展名

## 🔐 安全建议

1. **修改默认密码**: 修改 `docker-compose.yml` 中的数据库密码
2. **使用强密码**: `SESSION_SECRET` 应使用强随机字符串
3. **限制端口**: 生产环境不要暴露数据库和 Redis 端口到公网
4. **使用 HTTPS**: 配置 SSL 证书
5. **定期备份**: 定期备份数据库和重要数据

## 📚 相关文档

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Prisma 文档](https://www.prisma.io/docs)



