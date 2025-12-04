# LinkLore 快速部署指南

**目标**：在阿里云服务器（2核4GB）上部署 LinkLore  
**预计时间**：30-60 分钟

---

## 一、部署前准备清单

### 必须准备

- [ ] 阿里云服务器（2核4GB，已购买）
- [ ] 域名（已购买并解析到服务器 IP）
- [ ] 阿里云 RDS PostgreSQL（推荐，节省服务器资源）
- [ ] 阿里云 Redis（推荐，节省服务器资源）
- [ ] 阿里云 OSS（文件存储）

### 获取信息

1. **服务器信息**
   - IP 地址：`xxx.xxx.xxx.xxx`
   - 用户名：`root` 或 `your-user`
   - SSH 密钥或密码

2. **数据库信息**（RDS）
   - 主机地址：`your-rds-host.rds.aliyuncs.com`
   - 端口：`5432`
   - 数据库名：`linklore`
   - 用户名：`your-username`
   - 密码：`your-password`

3. **Redis 信息**（云 Redis）
   - 主机地址：`your-redis-host.redis.aliyuncs.com`
   - 端口：`6379`
   - 密码：`your-password`

4. **OSS 信息**
   - Region：`oss-cn-hangzhou`（根据实际选择）
   - AccessKey ID
   - AccessKey Secret
   - Bucket 名称

---

## 二、快速部署步骤

### 步骤 1：连接服务器

```bash
ssh root@your-server-ip
```

### 步骤 2：初始化服务器

```bash
# 下载并运行初始化脚本
curl -fsSL https://raw.githubusercontent.com/your-repo/linklore/main/infrastructure/scripts/bootstrap-alinux.sh | bash

# 或手动执行
cd /root
git clone <your-repo-url> linklore
cd linklore
chmod +x infrastructure/scripts/bootstrap-alinux.sh
sudo ./infrastructure/scripts/bootstrap-alinux.sh
```

**脚本会安装**：
- Node.js 20 LTS
- pnpm（通过 corepack）
- Nginx
- PM2
- LibreOffice
- 创建 2GB swap

### 步骤 3：配置环境变量

```bash
cd ~/linklore

# 创建环境变量文件
cat > apps/web/.env.production << 'EOF'
DATABASE_URL="postgresql://username:password@your-rds-host:5432/linklore?sslmode=require"
SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
REDIS_URL="redis://:password@your-redis-host:6379/0"
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="your-access-key-id"
OSS_ACCESS_KEY_SECRET="your-access-key-secret"
OSS_BUCKET="your-bucket-name"
AI_DEFAULT_PROVIDER="openai"
AI_ALLOWED_PROVIDERS="openai,qwen"
AI_FALLBACK_PROVIDER="qwen"
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50
QUEUE_CONCURRENCY=1
MAX_FILE_SIZE_MB=20
ALLOWED_EXT="doc,docx,txt,md"
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL="https://your-domain.com"
EOF

# 编辑环境变量（替换实际值）
nano apps/web/.env.production
```

**重要**：替换以下占位符：
- `your-rds-host` → RDS 主机地址
- `username:password` → 数据库用户名和密码
- `your-redis-host` → Redis 主机地址
- `password` → Redis 密码
- `your-access-key-id` → OSS AccessKey ID
- `your-access-key-secret` → OSS AccessKey Secret
- `your-bucket-name` → OSS Bucket 名称
- `your-domain.com` → 你的域名

### 步骤 4：运行部署脚本

```bash
cd ~/linklore
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh
```

**脚本会**：
1. 检查 Node.js、pnpm、PM2
2. 安装依赖
3. 生成 Prisma Client
4. 运行数据库迁移（可选）
5. 构建项目

### 步骤 5：配置 Nginx

```bash
# 复制 Nginx 配置
sudo cp ~/linklore/infrastructure/nginx/nginx.conf /etc/nginx/nginx.conf

# 编辑配置（修改域名）
sudo nano /etc/nginx/nginx.conf
```

**修改**：
- `server_name your-domain.com www.your-domain.com;` → 改为你的域名

### 步骤 6：配置 SSL 证书

**使用 Let's Encrypt（免费，推荐）**：

```bash
# 安装 Certbot
sudo yum install certbot python3-certbot-nginx -y  # Alibaba Cloud Linux
# 或
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu

# 获取证书（自动配置 Nginx）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

### 步骤 7：启动服务

```bash
cd ~/linklore

# 启动所有服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 设置开机自启
pm2 startup
pm2 save
```

### 步骤 8：验证部署

1. **检查服务状态**
   ```bash
   pm2 status
   sudo systemctl status nginx
   ```

2. **访问网站**
   - 打开浏览器访问：`https://your-domain.com`
   - 应该自动跳转到聊天页面
   - 测试匿名用户功能
   - 测试注册/登录功能

3. **健康检查**
   - 访问：`https://your-domain.com/api/health`
   - 应该返回 `{"ok": true, ...}`

---

## 三、如果使用本地数据库（不推荐）

如果必须使用本地 PostgreSQL 和 Redis：

### 安装 PostgreSQL

```bash
# Alibaba Cloud Linux
sudo dnf install postgresql15-server postgresql15 -y
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 创建数据库
sudo -u postgres psql -c "CREATE DATABASE linklore;"
sudo -u postgres psql -c "CREATE USER linklore WITH PASSWORD 'your-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE linklore TO linklore;"
```

### 安装 Redis

```bash
# Alibaba Cloud Linux
sudo dnf install redis -y
sudo systemctl enable redis
sudo systemctl start redis
```

### 优化配置

**PostgreSQL** (`/etc/postgresql/15/postgresql.conf`)：
```
max_connections = 50
shared_buffers = 512MB
effective_cache_size = 1GB
```

**Redis** (`/etc/redis/redis.conf`)：
```
maxmemory 256mb
maxmemory-policy allkeys-lru
```

---

## 四、常见问题排查

### 问题 1：PM2 服务无法启动

```bash
# 查看详细错误
pm2 logs linklore-web --err
pm2 logs linklore-worker --err

# 检查环境变量
cat apps/web/.env.production

# 手动测试启动
cd ~/linklore
pnpm --filter @linklore/web start
```

### 问题 2：数据库连接失败

```bash
# 测试数据库连接
psql "postgresql://username:password@host:5432/linklore"

# 检查防火墙
sudo firewall-cmd --list-all  # Alibaba Cloud Linux
sudo ufw status              # Ubuntu

# 检查 RDS 白名单（如果使用 RDS）
# 在阿里云控制台添加服务器 IP 到 RDS 白名单
```

### 问题 3：Nginx 502 错误

```bash
# 检查 Next.js 是否运行
pm2 status
curl http://127.0.0.1:3000

# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 检查端口
sudo netstat -tlnp | grep 3000
```

### 问题 4：SSL 证书问题

```bash
# 检查证书
sudo certbot certificates

# 手动续期
sudo certbot renew

# 检查证书路径
sudo ls -la /etc/letsencrypt/live/your-domain.com/
```

---

## 五、部署后维护

### 日常检查

```bash
# 查看服务状态
pm2 status

# 查看资源使用
pm2 monit

# 查看日志
pm2 logs --lines 100
```

### 更新代码

```bash
cd ~/linklore
git pull
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:migrate  # 如果有新迁移
pnpm build
pm2 restart ecosystem.config.js
```

### 备份

```bash
# 数据库备份（RDS 自动备份，或手动）
pg_dump "postgresql://..." > backup_$(date +%Y%m%d).sql

# 配置文件备份
tar -czf config_backup_$(date +%Y%m%d).tar.gz apps/web/.env.production ecosystem.config.js
```

---

## 六、资源监控

### 查看资源使用

```bash
# CPU 和内存
htop

# 磁盘
df -h

# 网络
iftop
```

### PM2 监控

```bash
# 实时监控
pm2 monit

# 查看详细信息
pm2 describe linklore-web
pm2 describe linklore-worker
```

---

## 七、性能优化建议

### 如果资源紧张

1. **使用云服务**（强烈推荐）
   - RDS PostgreSQL
   - 云 Redis
   - 这样可以节省约 500-700MB 内存

2. **优化 Next.js**
   - 启用静态生成
   - 使用 CDN 加速静态资源

3. **优化数据库**
   - 减少连接数
   - 添加索引
   - 定期清理数据

---

## 八、安全建议

1. **防火墙配置**
   ```bash
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --permanent --add-service=ssh
   sudo firewall-cmd --reload
   ```

2. **定期更新**
   ```bash
   sudo dnf update -y  # Alibaba Cloud Linux
   ```

3. **备份策略**
   - 数据库：RDS 自动备份
   - 文件：OSS 自动备份
   - 配置：定期备份 `.env.production`

---

## 九、快速命令参考

```bash
# 启动服务
pm2 start ecosystem.config.js

# 停止服务
pm2 stop ecosystem.config.js

# 重启服务
pm2 restart ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 查看特定服务日志
pm2 logs linklore-web
pm2 logs linklore-worker

# 监控
pm2 monit

# 删除服务
pm2 delete ecosystem.config.js

# 重载 Nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## 十、获取帮助

如果遇到问题：

1. **查看日志**
   - PM2 日志：`pm2 logs`
   - Nginx 日志：`/var/log/nginx/error.log`
   - 应用日志：`~/linklore/logs/`

2. **检查服务状态**
   - `pm2 status`
   - `sudo systemctl status nginx`

3. **查看详细部署文档**
   - `docs/DEPLOYMENT_ALIYUN.md`

---

**部署完成后，访问 `https://your-domain.com` 即可使用！**

