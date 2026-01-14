# LinkLore 宝塔面板 Docker 部署指南（阿里云）

**目标环境**：阿里云服务器（Alibaba Cloud Linux 3.2104 LTS 64位）+ 宝塔面板 + Docker  
**部署方式**：Docker Compose + 宝塔 Nginx 反向代理  
**预计时间**：30-45 分钟

---

## 一、前置准备

### 1.1 服务器要求

- **操作系统**：Alibaba Cloud Linux 3.2104 LTS 64位（已验证）
- **推荐配置**：2核4GB 或更高（4核8GB 更佳）
- **带宽**：3Mbps 或更高
- **磁盘**：至少 20GB 可用空间

### 1.2 需要准备的信息

- [ ] 阿里云服务器 IP 地址
- [ ] 域名（已解析到服务器 IP）
- [ ] 阿里云 OSS 配置信息（AccessKey ID、Secret、Bucket 名称）
- [ ] PostgreSQL 数据库信息（如果使用云数据库）
- [ ] Redis 信息（如果使用云 Redis）

---

## 二、安装宝塔面板和 Docker（15分钟）

### 2.1 安装宝塔面板

如果还没有安装宝塔面板，在服务器终端执行：

```bash
# Alibaba Cloud Linux 3 / CentOS
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh

# Ubuntu/Debian
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh
```

安装完成后记录：
- 面板地址：`http://your-server-ip:8888`
- 用户名和密码

### 2.2 登录宝塔面板并安装 Docker

1. 访问：`http://your-server-ip:8888`
2. 首次登录会提示安装 LNMP，**暂时跳过**（我们使用 Docker）
3. 进入 **软件商店** → 搜索 **Docker 管理器**
4. 点击 **安装** Docker 管理器
5. 等待安装完成（约 5-10 分钟）

**或者使用命令行安装 Docker**：

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 启动 Docker 服务
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker-compose --version
```

### 2.3 安装 Docker Compose（如果未安装）

```bash
# 下载 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

---

## 三、上传项目文件（5分钟）

### 方式1：使用 Git（推荐）

在宝塔面板 **终端** 中执行：

```bash
cd /www/wwwroot
git clone <your-repo-url> linklore
cd linklore
```

**注意**：如果使用私有仓库，需要先配置 SSH 密钥。

### 方式2：使用宝塔文件管理器

1. 进入 **文件** 菜单
2. 进入 `/www/wwwroot/` 目录
3. 上传项目压缩包
4. 解压并重命名为 `linklore`

---

## 四、配置环境变量（10分钟）

### 4.1 创建 .env 文件

在项目根目录创建 `.env` 文件（用于 Docker Compose）：

1. 在宝塔 **文件管理器** 中，进入 `/www/wwwroot/linklore/`
2. 点击 **新建** → **文件**
3. 文件名：`.env`
4. 点击 **创建**

### 4.2 编辑 .env 文件

点击 `.env` 文件，在编辑器中填入以下内容：

```bash
# ============================================
# PostgreSQL 数据库配置
# ============================================
# 如果使用 Docker 内的 PostgreSQL（推荐）
POSTGRES_DB=linklore
POSTGRES_USER=linklore_user
POSTGRES_PASSWORD=你的数据库密码（至少16位，建议使用强密码）

# 如果使用外部 PostgreSQL（如阿里云 RDS）
# DATABASE_URL=postgresql://用户名:密码@RDS地址:5432/linklore?sslmode=require

# ============================================
# Redis 配置
# ============================================
# 如果使用 Docker 内的 Redis（推荐）
REDIS_PASSWORD=你的Redis密码（可选，建议设置）

# 如果使用外部 Redis（如阿里云 Redis）
# REDIS_URL=redis://:密码@Redis地址:6379/0

# ============================================
# 会话密钥（必需，至少32字符）
# ============================================
# 生成方式：在终端执行
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=在这里填入生成的32位随机字符串

# ============================================
# 阿里云 OSS 配置（必需）
# ============================================
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=你的AccessKey ID
OSS_ACCESS_KEY_SECRET=你的AccessKey Secret
OSS_BUCKET=你的Bucket名称

# ============================================
# AI 配置（可选，根据需求调整）
# ============================================
AI_DEFAULT_PROVIDER=openai
AI_ALLOWED_PROVIDERS=openai,qwen
AI_FALLBACK_PROVIDER=qwen
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50

# ============================================
# 队列配置
# ============================================
QUEUE_CONCURRENCY=1

# ============================================
# 文件上传配置
# ============================================
MAX_FILE_SIZE_MB=20
ALLOWED_EXT=doc,docx,txt,md

# ============================================
# 生产环境配置
# ============================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 4.3 生成 SESSION_SECRET

在宝塔面板 **终端** 中执行：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制输出的字符串，替换 `.env` 中的 `SESSION_SECRET` 值。

### 4.4 替换占位符

**必须替换的值**：
- `你的数据库密码` → PostgreSQL 数据库密码（至少16位）
- `你的Redis密码` → Redis 密码（如果设置了）
- `你的AccessKey ID` → 阿里云 OSS AccessKey ID
- `你的AccessKey Secret` → 阿里云 OSS AccessKey Secret
- `你的Bucket名称` → 阿里云 OSS Bucket 名称
- `your-domain.com` → 你的实际域名

---

## 五、配置 Docker Compose（5分钟）

### 5.1 检查 docker-compose.yml

项目根目录应该已经有 `docker-compose.yml` 文件。如果需要修改端口或其他配置，可以编辑此文件。

**重要配置说明**：
- PostgreSQL 和 Redis 默认**不暴露端口**到主机（仅 Docker 网络访问，更安全）
- Web 应用监听 `3000` 端口（仅本地访问，通过 Nginx 反向代理）

### 5.2 修改 docker-compose.yml（可选）

如果需要使用外部数据库或 Redis，可以修改 `docker-compose.yml`：

**使用外部 PostgreSQL**：
```yaml
web:
  environment:
    DATABASE_URL: postgresql://用户名:密码@外部数据库地址:5432/linklore?sslmode=require
  # 移除 depends_on postgres
```

**使用外部 Redis**：
```yaml
web:
  environment:
    REDIS_URL: redis://:密码@外部Redis地址:6379/0
  # 移除 depends_on redis
```

---

## 六、启动 Docker 容器（10分钟）

### 6.1 方式1：使用宝塔 Docker 管理器（推荐）

1. 进入 **软件商店** → **Docker 管理器**
2. 点击 **容器** 标签
3. 点击 **创建容器**
4. 选择 **使用 docker-compose.yml**
5. 配置：
   - **项目路径**：`/www/wwwroot/linklore`
   - **Compose 文件**：`docker-compose.yml`
   - **环境文件**：`.env`
6. 点击 **创建并启动**

### 6.2 方式2：使用命令行（更灵活）

在宝塔面板 **终端** 中执行：

```bash
cd /www/wwwroot/linklore

# 构建并启动所有服务
docker-compose up -d

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 6.3 等待服务启动

首次启动需要：
1. 下载 Docker 镜像（约 5-10 分钟）
2. 构建应用镜像（约 5-10 分钟）
3. 启动容器

**查看启动进度**：

```bash
# 查看所有容器状态
docker-compose ps

# 查看 Web 应用日志
docker-compose logs -f web

# 查看数据库日志
docker-compose logs -f postgres

# 查看 Redis 日志
docker-compose logs -f redis
```

### 6.4 运行数据库迁移

等待 Web 容器启动后，执行数据库迁移：

```bash
cd /www/wwwroot/linklore

# 进入 Web 容器执行迁移
docker-compose exec web node server.js --migrate

# 或者使用 Prisma CLI（如果容器中有）
docker-compose exec web sh -c "cd /app && npx prisma migrate deploy"
```

**注意**：如果容器中没有 Prisma CLI，需要在构建时包含，或者使用外部数据库迁移工具。

---

## 七、配置网站和 Nginx（10分钟）

### 7.1 添加网站

1. 进入 **网站** 菜单
2. 点击 **添加站点**
3. 配置：
   - **域名**：`your-domain.com` 和 `www.your-domain.com`（两个都添加）
   - **根目录**：`/www/wwwroot/linklore`（或任意目录，因为我们使用反向代理）
   - **PHP 版本**：**纯静态**（不需要 PHP）
   - **其他选项**：保持默认
4. 点击 **提交**

### 7.2 配置反向代理

1. 在网站列表中，点击你的域名右侧的 **设置**
2. 进入 **反向代理** 标签
3. 点击 **添加反向代理**
4. 配置：
   - **代理名称**：`linklore`
   - **目标 URL**：`http://127.0.0.1:3000`
   - **发送域名**：`$host`
   - **其他选项**：保持默认
5. 点击 **保存**

### 7.3 优化 Nginx 配置

1. 在网站设置中，进入 **配置文件** 标签
2. 在 `location /` 块中，确保有以下配置：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 75s;
    client_max_body_size 25m;
}
```

3. 点击 **保存**，然后点击 **重载配置**

### 7.4 配置 SSL 证书（HTTPS）

1. 在网站设置中，进入 **SSL** 标签
2. 选择 **Let's Encrypt**（免费证书）
3. 勾选你的域名（`your-domain.com` 和 `www.your-domain.com`）
4. 点击 **申请**
5. 等待申请完成（约1-2分钟）
6. 申请成功后，开启 **强制 HTTPS**

---

## 八、配置防火墙和安全组（5分钟）

### 8.1 宝塔面板防火墙

1. 进入 **安全** 菜单
2. 确保以下端口已开放：
   - `80` (HTTP)
   - `443` (HTTPS)
   - `22` (SSH)
   - `8888` (宝塔面板，建议修改默认端口)
   - `3000` (Next.js，**不需要对外开放**，仅本地访问)

### 8.2 阿里云安全组

在阿里云控制台配置安全组规则：

1. 登录阿里云控制台
2. 进入 **ECS** → **网络与安全** → **安全组**
3. 找到你的服务器对应的安全组
4. 添加入方向规则：
   - **端口**：`80/80`，**协议**：TCP，**授权对象**：`0.0.0.0/0`
   - **端口**：`443/443`，**协议**：TCP，**授权对象**：`0.0.0.0/0`
   - **端口**：`22/22`，**协议**：TCP，**授权对象**：`你的IP/32`（建议限制SSH访问）

---

## 九、验证部署（5分钟）

### 9.1 检查容器状态

#### 在宝塔面板中：

1. **Docker 管理器** → **容器**：查看 3 个容器是否都在运行
   - `mooyu-web`（Web 应用）
   - `mooyu-postgres`（PostgreSQL）
   - `mooyu-redis`（Redis）

#### 在终端中：

```bash
cd /www/wwwroot/linklore

# 查看容器状态
docker-compose ps

# 查看容器日志
docker-compose logs web
docker-compose logs postgres
docker-compose logs redis

# 检查端口占用
netstat -tlnp | grep 3000
netstat -tlnp | grep 5432
netstat -tlnp | grep 6379
```

### 9.2 访问网站

1. 打开浏览器访问：`https://your-domain.com`
2. 应该看到应用首页
3. 测试功能：
   - 匿名用户访问
   - 注册功能（需要邀请码）
   - 登录功能
   - 聊天功能

### 9.3 健康检查

访问：`https://your-domain.com/api/health`

应该返回 JSON 响应：

```json
{
  "ok": true,
  "db": "up",
  "queue": {
    "status": "up",
    ...
  },
  "traceSystem": {
    "healthy": true,
    ...
  }
}
```

---

## 十、性能优化建议

### 10.1 Docker 资源限制

编辑 `docker-compose.yml`，添加资源限制：

```yaml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  postgres:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  redis:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### 10.2 Nginx 优化

在宝塔面板网站设置 → **性能优化** 中：

1. **开启 Gzip 压缩**（通常已默认开启）
2. **开启静态文件缓存**（可选）
3. **开启 HTTP/2**（如果支持）

### 10.3 PostgreSQL 优化

如果需要优化 PostgreSQL 性能，可以修改 `docker-compose.yml`：

```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "max_connections=100"
    - "-c"
    - "work_mem=64MB"
```

---

## 十一、日常维护

### 11.1 查看日志

#### 方式1：使用宝塔 Docker 管理器

- **Docker 管理器** → **容器** → 点击容器名称 → 查看日志

#### 方式2：使用命令行

```bash
cd /www/wwwroot/linklore

# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f web
docker-compose logs -f postgres
docker-compose logs -f redis

# 查看最近100行日志
docker-compose logs --tail=100 web
```

### 11.2 重启服务

#### 方式1：使用宝塔 Docker 管理器

- **Docker 管理器** → **容器** → 点击容器右侧的 **重启** 按钮

#### 方式2：使用命令行

```bash
cd /www/wwwroot/linklore

# 重启单个服务
docker-compose restart web

# 重启所有服务
docker-compose restart

# 停止所有服务
docker-compose stop

# 启动所有服务
docker-compose start
```

### 11.3 更新代码

```bash
cd /www/wwwroot/linklore

# 1. 拉取最新代码
git pull

# 2. 重新构建镜像（如果有代码变更）
docker-compose build web

# 3. 重启服务（使用新镜像）
docker-compose up -d --force-recreate web

# 或者完全重建
docker-compose up -d --build
```

### 11.4 数据库备份

#### 方式1：使用 Docker 命令备份

```bash
cd /www/wwwroot/linklore

# 创建备份目录
mkdir -p /www/backup

# 备份数据库
docker-compose exec postgres pg_dump -U linklore_user linklore > /www/backup/linklore_$(date +%Y%m%d_%H%M%S).sql
```

#### 方式2：使用宝塔计划任务

在宝塔面板 **计划任务** 中设置：

1. **任务类型**：Shell 脚本
2. **执行周期**：每天
3. **脚本内容**：

```bash
#!/bin/bash
BACKUP_DIR="/www/backup"
DATE=$(date +%Y%m%d_%H%M%S)
cd /www/wwwroot/linklore

mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec -T postgres pg_dump -U linklore_user linklore > $BACKUP_DIR/linklore_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "数据库备份完成: linklore_$DATE.sql"
```

### 11.5 清理 Docker 资源

定期清理未使用的镜像和容器：

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理所有未使用的资源
docker system prune -a
```

---

## 十二、常见问题排查

### 问题1：容器无法启动

**排查步骤**：

```bash
# 1. 查看容器日志
docker-compose logs web

# 2. 检查环境变量
docker-compose config

# 3. 检查端口占用
netstat -tlnp | grep 3000

# 4. 检查 Docker 服务状态
systemctl status docker
```

### 问题2：网站 502 Bad Gateway

**可能原因**：
1. Web 容器未启动
2. 端口 3000 被占用
3. 反向代理配置错误

**排查步骤**：

```bash
# 1. 检查容器状态
docker-compose ps

# 2. 检查端口占用
netstat -tlnp | grep 3000

# 3. 检查 Nginx 错误日志
tail -f /www/wwwlogs/your-domain.com.error.log

# 4. 手动测试应用
curl http://127.0.0.1:3000/api/health

# 5. 查看容器日志
docker-compose logs web
```

### 问题3：数据库连接失败

**排查步骤**：

```bash
# 1. 检查 PostgreSQL 容器状态
docker-compose ps postgres

# 2. 查看 PostgreSQL 日志
docker-compose logs postgres

# 3. 测试数据库连接（进入容器）
docker-compose exec postgres psql -U linklore_user -d linklore

# 4. 检查环境变量中的 DATABASE_URL
docker-compose exec web env | grep DATABASE_URL
```

### 问题4：Redis 连接失败

**排查步骤**：

```bash
# 1. 检查 Redis 容器状态
docker-compose ps redis

# 2. 查看 Redis 日志
docker-compose logs redis

# 3. 测试 Redis 连接（进入容器）
docker-compose exec redis redis-cli ping
# 如果设置了密码
docker-compose exec redis redis-cli -a 你的密码 ping

# 4. 检查环境变量中的 REDIS_URL
docker-compose exec web env | grep REDIS_URL
```

### 问题5：SSL 证书申请失败

**解决方案**：

1. 确保域名已正确解析到服务器 IP：
   ```bash
   ping your-domain.com
   ```

2. 确保 80 端口已开放（Let's Encrypt 需要）

3. 在宝塔面板中手动申请证书

4. 如果还是失败，检查域名是否已绑定其他证书

### 问题6：内存不足

**症状**：容器频繁重启，系统卡顿

**解决方案**：

```bash
# 1. 检查内存使用
free -h
docker stats

# 2. 优化 Docker 资源限制（见"性能优化"章节）

# 3. 清理未使用的 Docker 资源
docker system prune -a

# 4. 考虑升级服务器配置
```

### 问题7：构建镜像失败

**排查步骤**：

```bash
# 1. 查看构建日志
docker-compose build --no-cache web

# 2. 检查 Dockerfile 语法
docker build -t test-image .

# 3. 检查磁盘空间
df -h

# 4. 清理 Docker 缓存
docker builder prune
```

---

## 十三、部署检查清单

### 部署前准备

- [ ] 宝塔面板已安装
- [ ] Docker 和 Docker Compose 已安装
- [ ] 域名已解析到服务器 IP
- [ ] 阿里云 OSS 已创建并配置
- [ ] 环境变量文件（`.env`）已创建并配置

### 部署过程

- [ ] 项目文件已上传/克隆
- [ ] `.env` 文件已配置（所有占位符已替换）
- [ ] Docker 容器已启动（3个容器都在运行）
- [ ] 数据库迁移已运行
- [ ] 网站已添加
- [ ] SSL 证书已配置
- [ ] 反向代理已配置
- [ ] 防火墙已配置

### 部署后验证

- [ ] 网站可以访问（HTTPS）
- [ ] 健康检查通过（`/api/health`）
- [ ] 匿名用户功能正常
- [ ] 注册/登录功能正常
- [ ] 聊天功能正常
- [ ] Docker 容器开机自启已配置（可选）

---

## 十四、快速命令参考

```bash
# 进入项目目录
cd /www/wwwroot/linklore

# Docker Compose 管理
docker-compose ps                    # 查看状态
docker-compose logs -f               # 查看所有日志
docker-compose restart               # 重启所有服务
docker-compose stop                  # 停止所有服务
docker-compose start                 # 启动所有服务
docker-compose up -d                 # 启动所有服务（后台）
docker-compose down                  # 停止并删除容器
docker-compose build                 # 重新构建镜像

# 容器管理
docker-compose exec web sh           # 进入 Web 容器
docker-compose exec postgres psql -U linklore_user -d linklore  # 连接数据库
docker-compose exec redis redis-cli  # 连接 Redis

# 数据库操作
docker-compose exec postgres pg_dump -U linklore_user linklore > backup.sql  # 备份

# 查看日志
docker-compose logs --tail=100 web   # 查看最近100行日志
docker-compose logs -f web           # 实时查看日志

# 更新代码
git pull && docker-compose build web && docker-compose up -d --force-recreate web
```

---

## 十五、Docker 开机自启配置

### 方式1：使用 systemd（推荐）

创建 systemd 服务文件：

```bash
sudo nano /etc/systemd/system/linklore-docker.service
```

内容：

```ini
[Unit]
Description=LinkLore Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/www/wwwroot/linklore
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable linklore-docker.service
sudo systemctl start linklore-docker.service
```

### 方式2：使用宝塔计划任务

在宝塔面板 **计划任务** 中设置：

1. **任务类型**：Shell 脚本
2. **执行周期**：N分钟（1分钟）
3. **脚本内容**：

```bash
#!/bin/bash
cd /www/wwwroot/linklore
docker-compose ps | grep -q "Up" || docker-compose up -d
```

---

## 十六、技术支持与文档

- **项目文档**：查看 `README.md`
- **变更历史**：查看 `CHANGES_AI.md`
- **API 文档**：查看 `docs/API.md`
- **问题排查**：查看本文档的"常见问题排查"章节
- **Docker 文档**：查看 `DOCKER_DEPLOYMENT.md`

---

**部署完成后，访问 `https://your-domain.com` 即可使用！**

**遇到问题？** 
- 查看容器日志：`docker-compose logs -f web`
- 查看宝塔面板日志：网站 → 设置 → 日志
- 检查容器状态：`docker-compose ps`

