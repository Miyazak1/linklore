# 宝塔面板全新安装部署指南

## 前提条件

- ✅ 已重新初始化系统盘
- ✅ 已重新安装宝塔面板
- ✅ 已配置域名和 SSL（mooyu.fun）

## 第一步：安装必要软件

### 1.1 在宝塔面板中安装 Docker

1. 进入 **软件商店** → 搜索 **Docker**
2. 点击 **安装**
3. 等待安装完成

### 1.2 通过终端安装 Docker（如果宝塔面板安装失败）

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker compose version
```

### 1.3 安装 Git（如果未安装）

```bash
# Alibaba Cloud Linux 3
dnf install -y git

# 验证安装
git --version
```

## 第二步：克隆项目

```bash
# 进入网站目录
cd /www/wwwroot

# 克隆项目（如果使用 SSH，替换为 SSH 地址）
git clone https://github.com/Miyazak1/linklore.git

# 进入项目目录
cd linklore

# 查看文件
ls -la
```

## 第三步：配置环境变量

### 3.1 创建 .env 文件

```bash
cd /www/wwwroot/linklore

# 复制模板文件
cp env.template .env

# 编辑 .env 文件
nano .env
# 或使用宝塔面板的文件管理器编辑
```

### 3.2 配置 .env 文件内容

根据你的实际情况填写以下配置：

```env
# ============================================
# 数据库配置
# ============================================
POSTGRES_DB=linklore
POSTGRES_USER=linklore
POSTGRES_PASSWORD=你的强密码（至少16位）

# ============================================
# 会话密钥
# ============================================
# 生成随机字符串：openssl rand -base64 32
SESSION_SECRET=你的随机32位以上字符串

# ============================================
# Redis 配置
# ============================================
# 如果不需要 Redis 密码，留空即可
REDIS_PASSWORD=
REDIS_URL=redis://redis:6379

# ============================================
# Next.js 配置
# ============================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://mooyu.fun

# ============================================
# OSS 配置（可选）
# ============================================
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=你的OSS_ACCESS_KEY_ID
OSS_ACCESS_KEY_SECRET=你的OSS_ACCESS_KEY_SECRET
OSS_BUCKET=你的OSS_BUCKET

# ============================================
# AI 配置
# ============================================
AI_DEFAULT_PROVIDER=siliconflow
AI_ALLOWED_PROVIDERS=siliconflow
AI_FALLBACK_PROVIDER=siliconflow
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50

# SiliconFlow API Key
SILICONFLOW_API_KEY=你的SiliconFlow_API_KEY

# ============================================
# 队列配置
# ============================================
QUEUE_CONCURRENCY=1

# ============================================
# 文件配置
# ============================================
MAX_FILE_SIZE_MB=20
ALLOWED_EXT=doc,docx,txt,md
```

### 3.3 生成会话密钥

```bash
# 生成随机会话密钥
openssl rand -base64 32

# 将生成的字符串复制到 .env 文件的 SESSION_SECRET
```

## 第四步：启动 Docker 服务

### 4.1 检查配置文件

```bash
cd /www/wwwroot/linklore

# 确认 docker-compose.yml 存在
ls -la docker-compose.yml

# 确认 .env 文件存在
ls -la .env
```

### 4.2 启动服务

```bash
# 启动所有服务（PostgreSQL、Redis、Web）
docker compose up -d

# 查看启动状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 4.3 等待服务启动

```bash
# 等待 30 秒后检查状态
sleep 30
docker compose ps

# 应该看到所有容器都是 "Up" 状态
# postgres 和 redis 应该是 "healthy"
```

## 第五步：初始化数据库

### 5.1 运行数据库迁移

```bash
cd /www/wwwroot/linklore

# 进入 web 容器执行 Prisma 迁移
docker compose exec web pnpm prisma migrate deploy

# 或使用 npx（如果 pnpm 不可用）
docker compose exec web npx prisma migrate deploy
```

### 5.2 验证数据库连接

```bash
# 测试数据库连接
docker compose exec web npx prisma db pull
```

## 第六步：配置 Nginx 反向代理

### 6.1 在宝塔面板中配置

1. 进入 **网站** → 找到你的域名（mooyu.fun）
2. 点击 **设置** → **反向代理**
3. 点击 **添加反向代理**
4. 配置如下：
   - **代理名称**：linklore
   - **目标URL**：`http://127.0.0.1:3000`
   - **发送域名**：`$host`
   - **缓存**：关闭
5. 点击 **提交**

### 6.2 配置 SSL（如果未配置）

1. 进入 **网站** → 找到你的域名
2. 点击 **设置** → **SSL**
3. 选择 **Let's Encrypt** 或上传你的证书
4. 开启 **强制 HTTPS**

## 第七步：验证部署

### 7.1 检查容器状态

```bash
cd /www/wwwroot/linklore

# 查看所有容器状态
docker compose ps

# 应该看到：
# - mooyu-postgres: Up (healthy)
# - mooyu-redis: Up (healthy)
# - mooyu-web: Up
```

### 7.2 检查服务日志

```bash
# 查看所有服务日志
docker compose logs --tail=50

# 查看特定服务日志
docker compose logs web
docker compose logs postgres
docker compose logs redis
```

### 7.3 测试网站访问

1. 在浏览器访问：`https://mooyu.fun`
2. 检查是否能正常访问
3. 检查 API 健康检查：`https://mooyu.fun/api/health`

## 第八步：设置自动启动

### 8.1 确保 Docker 服务自动启动

```bash
# Docker 服务应该已经设置为自动启动
systemctl enable docker
systemctl status docker
```

### 8.2 设置容器自动重启

`docker-compose.yml` 中已经配置了 `restart: unless-stopped`，容器会自动重启。

## 常见问题排查

### 问题1：容器无法启动

```bash
# 查看详细日志
docker compose logs --tail=100

# 检查配置文件
docker compose config

# 检查磁盘空间
df -h
```

### 问题2：数据库连接失败

```bash
# 检查 PostgreSQL 容器状态
docker compose ps postgres

# 查看 PostgreSQL 日志
docker compose logs postgres

# 检查环境变量
docker compose exec postgres env | grep POSTGRES
```

### 问题3：Web 容器找不到模块

```bash
# 重新构建镜像
docker compose build --no-cache web

# 重启服务
docker compose up -d web
```

### 问题4：端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep 3000

# 如果被占用，修改 docker-compose.yml 中的端口映射
```

## 快速部署脚本

如果以上步骤太繁琐，可以使用自动化脚本：

```bash
cd /www/wwwroot/linklore

# 给脚本执行权限
chmod +x infrastructure/scripts/deploy-bt-docker.sh

# 执行部署脚本（需要先配置 .env 文件）
./infrastructure/scripts/deploy-bt-docker.sh
```

## 下一步

部署完成后，你可以：

1. 访问网站：`https://mooyu.fun`
2. 配置 AI API Key（在 .env 文件中）
3. 上传文件测试功能
4. 查看监控和日志

## 相关文档

- [环境变量配置说明](./docs/ENV_TEMPLATE.md)
- [Docker 故障排查](./docs/BT_DOCKER_TROUBLESHOOT.md)
- [磁盘清理指南](./docs/BT_DISK_CLEANUP.md)

