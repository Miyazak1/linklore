# LinkLore 阿里云服务器部署指南

**目标环境**：阿里云服务器（2核4GB，香港域名）  
**部署方式**：PM2 进程管理 + Nginx 反向代理

---

## 一、部署前准备

### 1.1 服务器要求

- **操作系统**：Alibaba Cloud Linux 3 / CentOS 7+ / Ubuntu 20.04+
- **CPU**：2 核
- **内存**：4GB
- **磁盘**：至少 20GB 可用空间

### 1.2 推荐使用云服务（强烈建议）

为了节省服务器资源，强烈建议使用：

1. **阿里云 RDS PostgreSQL**（数据库）
   - 规格：1核1GB 或更高
   - 版本：PostgreSQL 14+

2. **阿里云 Redis**（缓存和队列）
   - 规格：1GB 内存
   - 版本：Redis 6.0+

如果使用云服务，服务器只需要运行：
- Next.js 应用（约 200-400MB 内存）
- Worker 进程（约 100-200MB 内存）
- Nginx（约 20-50MB 内存）

**总计约 320-650MB**，4GB 内存完全足够。

---

## 二、服务器初始化

### 2.1 连接到服务器

```bash
ssh root@your-server-ip
```

### 2.2 运行初始化脚本

```bash
# 下载并运行初始化脚本
curl -fsSL https://raw.githubusercontent.com/your-repo/linklore/main/infrastructure/scripts/bootstrap-alinux.sh | bash

# 或手动执行
cd /path/to/linklore
chmod +x infrastructure/scripts/bootstrap-alinux.sh
sudo ./infrastructure/scripts/bootstrap-alinux.sh
```

**初始化脚本会安装**：
- Node.js 20 LTS
- Nginx
- LibreOffice（headless，用于文档处理）
- 可选：Redis（如果选择本地运行）

### 2.3 创建非 root 用户（推荐）

```bash
# 创建用户
adduser linklore
usermod -aG sudo linklore

# 切换到新用户
su - linklore
```

---

## 三、项目部署

### 3.1 克隆项目

```bash
# 在用户主目录
cd ~
git clone <your-repo-url> linklore
cd linklore
```

### 3.2 配置环境变量

```bash
# 复制环境变量模板
cp apps/web/.env.production.example apps/web/.env.production

# 编辑环境变量
nano apps/web/.env.production
```

**必须配置的变量**：
- `DATABASE_URL` - 数据库连接（推荐使用 RDS）
- `SESSION_SECRET` - 会话密钥（至少32字符）
- `REDIS_URL` - Redis 连接（推荐使用云 Redis）
- `OSS_REGION`, `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`, `OSS_BUCKET` - OSS 配置

### 3.3 运行部署脚本

```bash
# 给脚本执行权限
chmod +x infrastructure/scripts/deploy.sh

# 运行部署脚本
./infrastructure/scripts/deploy.sh
```

**部署脚本会**：
1. 检查 Node.js、pnpm、PM2
2. 安装依赖
3. 生成 Prisma Client
4. 运行数据库迁移（可选）
5. 构建项目

### 3.4 手动部署（如果脚本失败）

```bash
# 1. 安装依赖
pnpm install --frozen-lockfile

# 2. 生成 Prisma Client
pnpm prisma:generate

# 3. 运行数据库迁移
pnpm prisma:migrate

# 4. 构建项目
pnpm build

# 5. 创建日志目录
mkdir -p logs
```

---

## 四、配置 Nginx

### 4.1 复制 Nginx 配置

```bash
sudo cp infrastructure/nginx/nginx.conf /etc/nginx/nginx.conf
```

### 4.2 修改 Nginx 配置

编辑 `/etc/nginx/nginx.conf`：

```bash
sudo nano /etc/nginx/nginx.conf
```

**需要修改的地方**：
1. `server_name` - 改为你的域名
2. `ssl_certificate` 和 `ssl_certificate_key` - SSL 证书路径

### 4.3 配置 SSL 证书

**方式1：使用 Let's Encrypt（免费）**

```bash
# 安装 Certbot
sudo yum install certbot python3-certbot-nginx -y  # Alibaba Cloud Linux
# 或
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期（已自动配置）
```

**方式2：使用阿里云 SSL 证书**

1. 在阿里云控制台申请 SSL 证书
2. 下载证书文件
3. 上传到服务器：`/etc/nginx/ssl/`
4. 修改 Nginx 配置中的证书路径

### 4.4 测试并重载 Nginx

```bash
# 测试配置
sudo nginx -t

# 重载配置
sudo systemctl reload nginx
```

---

## 五、启动服务

### 5.1 使用 PM2 启动

```bash
# 启动所有服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs
```

### 5.2 设置开机自启

```bash
# 生成启动脚本
pm2 startup

# 保存当前进程列表
pm2 save
```

---

## 六、验证部署

### 6.1 检查服务状态

```bash
# PM2 状态
pm2 status

# Nginx 状态
sudo systemctl status nginx

# 端口监听
sudo netstat -tlnp | grep -E '3000|80|443'
```

### 6.2 访问应用

1. **HTTP**：`http://your-domain.com`（应该重定向到 HTTPS）
2. **HTTPS**：`https://your-domain.com`
3. **健康检查**：`https://your-domain.com/api/health`

### 6.3 测试功能

1. 访问首页，应该自动跳转到聊天页面
2. 以匿名用户身份测试聊天功能
3. 测试注册功能
4. 测试登录功能

---

## 七、监控和维护

### 7.1 PM2 监控

```bash
# 实时监控
pm2 monit

# 查看日志
pm2 logs linklore-web
pm2 logs linklore-worker

# 查看详细信息
pm2 describe linklore-web
```

### 7.2 日志位置

- Web 应用日志：`./logs/web-out.log` 和 `./logs/web-error.log`
- Worker 日志：`./logs/worker-out.log` 和 `./logs/worker-error.log`
- Nginx 日志：`/var/log/nginx/access.log` 和 `/var/log/nginx/error.log`

### 7.3 性能监控

```bash
# 查看系统资源使用
htop
# 或
top

# 查看内存使用
free -h

# 查看磁盘使用
df -h
```

---

## 八、常见问题

### 8.1 端口被占用

```bash
# 查看端口占用
sudo lsof -i :3000

# 杀死进程
sudo kill -9 <PID>
```

### 8.2 数据库连接失败

1. 检查 `DATABASE_URL` 是否正确
2. 检查数据库是否允许远程连接
3. 检查防火墙和安全组规则

### 8.3 Redis 连接失败

1. 检查 `REDIS_URL` 是否正确
2. 检查 Redis 服务是否运行
3. 检查防火墙规则

### 8.4 内存不足

如果出现内存不足：

1. **使用云数据库和云 Redis**（强烈推荐）
2. 限制 PostgreSQL 连接数
3. 限制 Redis 内存使用
4. 减少 Worker 并发数

### 8.5 SSL 证书问题

```bash
# 检查证书
sudo certbot certificates

# 手动续期
sudo certbot renew
```

---

## 九、更新部署

### 9.1 更新代码

```bash
# 拉取最新代码
git pull

# 重新安装依赖（如果有新依赖）
pnpm install --frozen-lockfile

# 重新生成 Prisma Client
pnpm prisma:generate

# 运行数据库迁移（如果有新迁移）
pnpm prisma:migrate

# 重新构建
pnpm build

# 重启服务
pm2 restart ecosystem.config.js
```

### 9.2 回滚

```bash
# 回滚到上一个版本
git checkout <previous-commit>

# 重新构建和重启
pnpm build
pm2 restart ecosystem.config.js
```

---

## 十、安全建议

### 10.1 防火墙配置

```bash
# 只开放必要端口
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 10.2 定期备份

1. **数据库备份**：使用 RDS 自动备份
2. **文件备份**：定期备份 OSS 数据
3. **配置备份**：备份 `.env.production` 和 Nginx 配置

### 10.3 更新系统

```bash
# Alibaba Cloud Linux
sudo dnf update -y

# Ubuntu
sudo apt update && sudo apt upgrade -y
```

---

## 十一、资源优化建议

### 11.1 如果必须本地运行数据库

**PostgreSQL 优化**：

```bash
# 编辑 PostgreSQL 配置
sudo nano /etc/postgresql/14/main/postgresql.conf

# 修改以下参数：
max_connections = 50          # 减少连接数
shared_buffers = 512MB        # 共享缓冲区
effective_cache_size = 1GB    # 有效缓存
work_mem = 10MB              # 工作内存
maintenance_work_mem = 128MB # 维护工作内存
```

**Redis 优化**：

```bash
# 编辑 Redis 配置
sudo nano /etc/redis/redis.conf

# 修改以下参数：
maxmemory 256mb              # 限制内存
maxmemory-policy allkeys-lru # 内存淘汰策略
```

### 11.2 Next.js 优化

- 启用静态生成（如果适用）
- 使用 CDN 加速静态资源
- 启用 Gzip 压缩（Nginx 已配置）

---

## 十二、部署检查清单

### 部署前

- [ ] 服务器已初始化（Node.js、Nginx 已安装）
- [ ] 域名 DNS 已解析到服务器 IP
- [ ] SSL 证书已准备（Let's Encrypt 或阿里云）
- [ ] 云数据库（RDS）已创建（推荐）
- [ ] 云 Redis 已创建（推荐）
- [ ] 阿里云 OSS 已创建并配置
- [ ] 环境变量已配置（`.env.production`）

### 部署中

- [ ] 项目代码已克隆
- [ ] 依赖已安装
- [ ] Prisma Client 已生成
- [ ] 数据库迁移已运行
- [ ] 项目已构建
- [ ] Nginx 已配置
- [ ] SSL 证书已配置
- [ ] PM2 已启动服务

### 部署后

- [ ] 服务正常运行（`pm2 status`）
- [ ] 网站可以访问（HTTPS）
- [ ] 健康检查通过（`/api/health`）
- [ ] 匿名用户功能正常
- [ ] 注册/登录功能正常
- [ ] 聊天功能正常
- [ ] PM2 开机自启已配置

---

## 十三、快速部署命令

```bash
# 1. 初始化服务器
curl -fsSL https://raw.githubusercontent.com/your-repo/linklore/main/infrastructure/scripts/bootstrap-alinux.sh | bash

# 2. 克隆项目
git clone <your-repo-url> linklore && cd linklore

# 3. 配置环境变量
cp apps/web/.env.production.example apps/web/.env.production
nano apps/web/.env.production

# 4. 运行部署脚本
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh

# 5. 配置 Nginx
sudo cp infrastructure/nginx/nginx.conf /etc/nginx/nginx.conf
sudo nano /etc/nginx/nginx.conf  # 修改域名和证书路径

# 6. 配置 SSL（Let's Encrypt）
sudo certbot --nginx -d your-domain.com

# 7. 启动服务
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

---

**部署完成后，访问 `https://your-domain.com` 即可使用！**

**遇到问题？** 查看日志：`pm2 logs` 或 `/var/log/nginx/error.log`

