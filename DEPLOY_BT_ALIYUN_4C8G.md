# LinkLore 阿里云宝塔面板完整部署方案

**目标环境**：阿里云服务器（4核8GB，5mbps带宽）+ 宝塔面板  
**部署方式**：PM2 进程管理 + 宝塔 Nginx + 本地 PostgreSQL/Redis  
**预计时间**：30-45 分钟

---

## 一、资源评估与规划

### 1.1 服务器资源分配建议

**4核8GB 服务器资源分配**：

| 服务 | CPU | 内存 | 说明 |
|------|-----|------|------|
| Next.js Web | 1核 | 1.5GB | 主应用服务 |
| Worker 进程 | 1核 | 500MB | AI队列处理 |
| Baike Scheduler | 0.5核 | 200MB | 定时任务 |
| PostgreSQL | 1核 | 2GB | 数据库（宝塔安装） |
| Redis | 0.5核 | 500MB | 缓存/队列（宝塔安装） |
| Nginx | 0.5核 | 100MB | 反向代理 |
| 系统预留 | 0.5核 | 1.2GB | 操作系统和其他 |
| **总计** | **4核** | **6GB** | 预留2GB缓冲 |

**结论**：4核8GB 配置完全足够，且有充足余量。

### 1.2 带宽评估

- **5mbps = 625KB/s**
- 对于中小型应用足够
- 建议开启 Nginx Gzip 压缩
- 静态资源建议使用 CDN（可选）

---

## 二、宝塔面板准备（10分钟）

### 2.1 安装宝塔面板（如果未安装）

```bash
# CentOS/Alibaba Cloud Linux
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh

# Ubuntu/Debian
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh
```

安装完成后记录：
- 面板地址：`http://your-server-ip:8888`
- 用户名和密码

### 2.2 登录宝塔面板并安装基础环境

1. 访问：`http://your-server-ip:8888`
2. 首次登录会提示安装 LNMP，选择 **LNMP**（推荐）或 **LAMP**
3. 等待安装完成（约10-15分钟）

---

## 三、安装必需软件（15分钟）

### 3.1 在宝塔面板软件商店安装

**路径**：宝塔面板 → **软件商店** → 搜索安装

#### 必需软件列表：

1. **Node.js 版本管理器**
   - 安装后，在管理界面安装 **Node.js 20.x**（推荐 20.11.0 或更高）
   - 验证：在终端执行 `node -v` 应显示 `v20.x.x`

2. **PM2 管理器**（推荐）
   - 或手动安装：在终端执行 `npm install -g pm2`
   - 验证：`pm2 -v`

3. **PostgreSQL**（数据库）
   - 版本：PostgreSQL 14 或 15
   - 安装后记录：
     - 数据库端口：`5432`（默认）
     - 数据库密码（安装时设置）
   - **重要**：安装后需要创建数据库 `linklore`

4. **Redis**（缓存/队列）
   - 版本：Redis 7.x
   - 安装后记录：
     - Redis 端口：`6379`（默认）
     - Redis 密码（安装时设置，建议设置强密码）

5. **Nginx**（通常已随 LNMP 安装）
   - 确认已安装并运行

### 3.2 安装系统依赖（LibreOffice）

在宝塔面板 **终端** 中执行：

```bash
# Alibaba Cloud Linux / CentOS
sudo yum install -y libreoffice-headless

# Ubuntu / Debian
sudo apt install -y libreoffice --no-install-recommends

# 验证安装
libreoffice --version
```

---

## 四、创建数据库和用户（5分钟）

### 4.1 在宝塔面板中创建数据库

1. 进入 **数据库** 菜单
2. 点击 **添加数据库**
3. 配置：
   - 数据库名：`linklore`
   - 用户名：`linklore_user`（或自定义）
   - 密码：**生成强密码并记录**
   - 访问权限：`本地服务器`
4. 点击 **提交**

### 4.2 记录数据库连接信息

记录以下信息，后续配置环境变量需要：

```
数据库主机：localhost（或 127.0.0.1）
数据库端口：5432
数据库名：linklore
用户名：linklore_user
密码：你设置的密码
```

---

## 五、上传项目文件（5分钟）

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

## 六、配置环境变量（10分钟）

### 6.1 创建环境变量文件

1. 在宝塔 **文件管理器** 中，进入 `/www/wwwroot/linklore/apps/web/`
2. 点击 **新建** → **文件**
3. 文件名：`.env.production`
4. 点击 **创建**

### 6.2 编辑环境变量

点击 `.env.production` 文件，在编辑器中填入以下内容：

```bash
# ============================================
# 数据库配置（使用宝塔安装的 PostgreSQL）
# ============================================
DATABASE_URL="postgresql://linklore_user:你的数据库密码@localhost:5432/linklore"

# ============================================
# 会话密钥（必需，至少32字符）
# ============================================
# 生成方式：在终端执行
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET="在这里填入生成的32位随机字符串"

# ============================================
# Redis 配置（使用宝塔安装的 Redis）
# ============================================
# 如果 Redis 设置了密码：
REDIS_URL="redis://:你的Redis密码@localhost:6379/0"
# 如果 Redis 没有密码：
# REDIS_URL="redis://localhost:6379/0"

# ============================================
# 阿里云 OSS 配置（必需）
# ============================================
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="你的AccessKey ID"
OSS_ACCESS_KEY_SECRET="你的AccessKey Secret"
OSS_BUCKET="你的Bucket名称"

# ============================================
# AI 配置（可选，根据需求调整）
# ============================================
AI_DEFAULT_PROVIDER="openai"
AI_ALLOWED_PROVIDERS="openai,qwen"
AI_FALLBACK_PROVIDER="qwen"
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
ALLOWED_EXT="doc,docx,txt,md"

# ============================================
# 生产环境配置
# ============================================
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### 6.3 生成 SESSION_SECRET

在宝塔面板 **终端** 中执行：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制输出的字符串，替换 `.env.production` 中的 `SESSION_SECRET` 值。

### 6.4 替换占位符

**必须替换的值**：
- `你的数据库密码` → PostgreSQL 数据库密码
- `你的Redis密码` → Redis 密码（如果设置了）
- `你的AccessKey ID` → 阿里云 OSS AccessKey ID
- `你的AccessKey Secret` → 阿里云 OSS AccessKey Secret
- `你的Bucket名称` → 阿里云 OSS Bucket 名称
- `your-domain.com` → 你的实际域名

---

## 七、部署项目（10分钟）

### 7.1 使用部署脚本（推荐）

在宝塔面板 **终端** 中执行：

```bash
cd /www/wwwroot/linklore

# 给脚本添加执行权限
chmod +x infrastructure/scripts/deploy-bt.sh

# 运行部署脚本
./infrastructure/scripts/deploy-bt.sh
```

脚本会自动：
1. 检查 Node.js、pnpm、PM2
2. 安装项目依赖
3. 生成 Prisma Client
4. 运行数据库迁移
5. 构建项目

### 7.2 手动部署（如果脚本失败）

```bash
cd /www/wwwroot/linklore

# 1. 启用 pnpm
corepack enable
corepack prepare pnpm@9.0.0 --activate

# 2. 安装依赖
pnpm install --frozen-lockfile

# 3. 生成 Prisma Client
pnpm prisma:generate

# 4. 运行数据库迁移（创建表结构）
pnpm prisma:migrate

# 5. 构建项目
pnpm build

# 6. 创建日志目录
mkdir -p logs
```

---

## 八、配置 PM2 进程管理（5分钟）

### 8.1 方式1：使用宝塔 PM2 管理器（推荐）

1. 打开 **软件商店** → **PM2 管理器**
2. 点击 **添加 Node 项目**

#### 项目1：linklore-web（Web 应用）

- **项目名称**：`linklore-web`
- **项目路径**：`/www/wwwroot/linklore`
- **启动文件**：`pnpm`
- **项目参数**：`--filter @linklore/web start`
- **运行目录**：`/www/wwwroot/linklore`
- **Node 版本**：选择 `20.x`
- **运行模式**：`fork`
- **实例数量**：`1`
- **环境变量**：从 `.env.production` 自动读取（或手动添加）

#### 项目2：linklore-worker（Worker 进程）

- **项目名称**：`linklore-worker`
- **项目路径**：`/www/wwwroot/linklore`
- **启动文件**：`node`
- **项目参数**：`./worker/ai-queue/dist/index.js`
- **运行目录**：`/www/wwwroot/linklore`
- **Node 版本**：选择 `20.x`
- **运行模式**：`fork`
- **实例数量**：`1`
- **环境变量**：从 `.env.production` 自动读取

#### 项目3：linklore-baike-scheduler（定时任务）

- **项目名称**：`linklore-baike-scheduler`
- **项目路径**：`/www/wwwroot/linklore`
- **启动文件**：`pnpm`
- **项目参数**：`--filter @linklore/web baike:schedule`
- **运行目录**：`/www/wwwroot/linklore`
- **Node 版本**：选择 `20.x`
- **运行模式**：`fork`
- **实例数量**：`1`
- **环境变量**：从 `.env.production` 自动读取

### 8.2 方式2：使用命令行 PM2

在宝塔终端中执行：

```bash
cd /www/wwwroot/linklore

# 启动所有服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

### 8.3 验证 PM2 状态

```bash
pm2 status
```

应该看到 3 个进程都在运行：
- `linklore-web`
- `linklore-worker`
- `linklore-baike-scheduler`

---

## 九、配置网站和 Nginx（10分钟）

### 9.1 添加网站

1. 进入 **网站** 菜单
2. 点击 **添加站点**
3. 配置：
   - **域名**：`your-domain.com` 和 `www.your-domain.com`（两个都添加）
   - **根目录**：`/www/wwwroot/linklore`（或自定义，如 `/www/wwwroot/linklore/public`）
   - **PHP 版本**：**纯静态**（不需要 PHP）
   - **其他选项**：保持默认
4. 点击 **提交**

### 9.2 配置反向代理

1. 在网站列表中，点击你的域名右侧的 **设置**
2. 进入 **反向代理** 标签
3. 点击 **添加反向代理**
4. 配置：
   - **代理名称**：`linklore`
   - **目标 URL**：`http://127.0.0.1:3000`
   - **发送域名**：`$host`
   - **其他选项**：保持默认
5. 点击 **保存**

### 9.3 配置 SSL 证书（HTTPS）

1. 在网站设置中，进入 **SSL** 标签
2. 选择 **Let's Encrypt**（免费证书）
3. 勾选你的域名（`your-domain.com` 和 `www.your-domain.com`）
4. 点击 **申请**
5. 等待申请完成（约1-2分钟）
6. 申请成功后，开启 **强制 HTTPS**

### 9.4 优化 Nginx 配置（可选）

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

---

## 十、配置防火墙和安全组（5分钟）

### 10.1 宝塔面板防火墙

1. 进入 **安全** 菜单
2. 确保以下端口已开放：
   - `80` (HTTP)
   - `443` (HTTPS)
   - `22` (SSH)
   - `8888` (宝塔面板，建议修改默认端口)
   - `3000` (Next.js，仅本地访问，不需要对外开放)

### 10.2 阿里云安全组

在阿里云控制台配置安全组规则：

1. 登录阿里云控制台
2. 进入 **ECS** → **网络与安全** → **安全组**
3. 找到你的服务器对应的安全组
4. 添加入方向规则：
   - **端口**：`80/80`，**协议**：TCP，**授权对象**：`0.0.0.0/0`
   - **端口**：`443/443`，**协议**：TCP，**授权对象**：`0.0.0.0/0`
   - **端口**：`22/22`，**协议**：TCP，**授权对象**：`你的IP/32`（建议限制SSH访问）

---

## 十一、验证部署（5分钟）

### 11.1 检查服务状态

#### 在宝塔面板中：

1. **PM2 管理器**：查看 3 个进程是否都在运行
2. **网站**：查看网站状态是否正常
3. **数据库**：查看 PostgreSQL 是否运行
4. **Redis**：查看 Redis 是否运行

#### 在终端中：

```bash
# 检查 PM2 状态
pm2 status

# 检查端口占用
netstat -tlnp | grep 3000
netstat -tlnp | grep 5432
netstat -tlnp | grep 6379

# 检查进程
ps aux | grep node
```

### 11.2 访问网站

1. 打开浏览器访问：`https://your-domain.com`
2. 应该看到应用首页
3. 测试功能：
   - 匿名用户访问
   - 注册功能（需要邀请码）
   - 登录功能
   - 聊天功能

### 11.3 健康检查

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

## 十二、性能优化建议

### 12.1 Nginx 优化

在宝塔面板网站设置 → **性能优化** 中：

1. **开启 Gzip 压缩**（通常已默认开启）
2. **开启静态文件缓存**（可选）
3. **开启 HTTP/2**（如果支持）

### 12.2 PM2 优化（针对 4核8GB）

编辑 `ecosystem.config.js`，可以适当增加实例数：

```javascript
// Web 应用可以增加到 2 个实例（利用多核）
instances: 2,
exec_mode: 'cluster',  // 改为 cluster 模式
```

**注意**：首次部署建议保持单实例，稳定后再优化。

### 12.3 PostgreSQL 优化

在宝塔面板 PostgreSQL 设置中：

1. **共享内存**：建议设置为 `2GB`（4核8GB服务器）
2. **最大连接数**：建议设置为 `100`
3. **工作内存**：建议设置为 `64MB`

### 12.4 Redis 优化

在宝塔面板 Redis 设置中：

1. **最大内存**：建议设置为 `512MB`
2. **持久化**：开启 RDB 和 AOF（数据安全）

---

## 十三、日常维护

### 13.1 查看日志

#### 方式1：使用宝塔面板

- **PM2 管理器** → 点击项目 → 查看日志
- **网站** → 设置 → 日志

#### 方式2：使用文件管理器

日志位置：`/www/wwwroot/linklore/logs/`
- `web-out.log` - Web 应用输出日志
- `web-error.log` - Web 应用错误日志
- `worker-out.log` - Worker 输出日志
- `worker-error.log` - Worker 错误日志
- `baike-scheduler-out.log` - 定时任务输出日志
- `baike-scheduler-error.log` - 定时任务错误日志

#### 方式3：使用终端

```bash
# 查看 PM2 日志
pm2 logs linklore-web
pm2 logs linklore-worker
pm2 logs linklore-baike-scheduler

# 查看所有日志
pm2 logs
```

### 13.2 重启服务

#### 方式1：使用宝塔面板

- **PM2 管理器** → 点击项目右侧的 **重启** 按钮

#### 方式2：使用终端

```bash
# 重启单个服务
pm2 restart linklore-web
pm2 restart linklore-worker

# 重启所有服务
pm2 restart ecosystem.config.js

# 或
pm2 restart all
```

### 13.3 更新代码

```bash
cd /www/wwwroot/linklore

# 1. 拉取最新代码
git pull

# 2. 重新安装依赖（如果有新依赖）
pnpm install --frozen-lockfile

# 3. 重新生成 Prisma Client
pnpm prisma:generate

# 4. 运行数据库迁移（如果有新迁移）
pnpm prisma:migrate

# 5. 重新构建
pnpm build

# 6. 重启服务
pm2 restart ecosystem.config.js
```

### 13.4 数据库备份

在宝塔面板 **计划任务** 中设置：

1. **任务类型**：Shell 脚本
2. **执行周期**：每天
3. **脚本内容**：

```bash
#!/bin/bash
# 数据库备份脚本
BACKUP_DIR="/www/backup"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="linklore"
DB_USER="linklore_user"
DB_PASS="你的数据库密码"

mkdir -p $BACKUP_DIR

# 备份数据库
PGPASSWORD=$DB_PASS pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/linklore_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "数据库备份完成: linklore_$DATE.sql"
```

### 13.5 日志清理

在宝塔面板 **计划任务** 中设置：

1. **任务类型**：Shell 脚本
2. **执行周期**：每周
3. **脚本内容**：

```bash
#!/bin/bash
# 清理7天前的日志
find /www/wwwroot/linklore/logs -name "*.log" -mtime +7 -delete
echo "日志清理完成"
```

---

## 十四、常见问题排查

### 问题1：PM2 无法启动项目

**排查步骤**：

1. 检查 Node.js 版本：
   ```bash
   node -v  # 应该是 v20.x.x
   ```

2. 检查项目路径是否正确

3. 检查环境变量文件是否存在：
   ```bash
   ls -la /www/wwwroot/linklore/apps/web/.env.production
   ```

4. 查看 PM2 错误日志：
   ```bash
   pm2 logs linklore-web --err
   ```

### 问题2：网站 502 Bad Gateway

**可能原因**：
1. Next.js 应用未启动
2. 端口 3000 被占用
3. 反向代理配置错误

**排查步骤**：

```bash
# 1. 检查 PM2 状态
pm2 status

# 2. 检查端口占用
netstat -tlnp | grep 3000

# 3. 检查 Nginx 错误日志
tail -f /www/wwwlogs/your-domain.com.error.log

# 4. 手动测试应用
curl http://127.0.0.1:3000/api/health
```

### 问题3：数据库连接失败

**排查步骤**：

1. 检查 PostgreSQL 是否运行：
   ```bash
   # 在宝塔面板中查看 PostgreSQL 状态
   # 或
   systemctl status postgresql
   ```

2. 检查数据库连接信息：
   ```bash
   # 测试连接
   psql -U linklore_user -h localhost -d linklore
   ```

3. 检查 `.env.production` 中的 `DATABASE_URL` 是否正确

4. 检查数据库用户权限

### 问题4：Redis 连接失败

**排查步骤**：

1. 检查 Redis 是否运行：
   ```bash
   # 在宝塔面板中查看 Redis 状态
   # 或
   systemctl status redis
   ```

2. 测试 Redis 连接：
   ```bash
   redis-cli -h localhost -p 6379
   # 如果设置了密码
   redis-cli -h localhost -p 6379 -a 你的密码
   ```

3. 检查 `.env.production` 中的 `REDIS_URL` 是否正确

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

**症状**：PM2 进程频繁重启，系统卡顿

**解决方案**：

1. 检查内存使用：
   ```bash
   free -h
   pm2 monit
   ```

2. 优化 PM2 配置，减少实例数或降低内存限制

3. 优化 PostgreSQL 和 Redis 内存配置

4. 考虑升级服务器配置

---

## 十五、部署检查清单

### 部署前准备

- [ ] 宝塔面板已安装
- [ ] Node.js 20.x 已安装
- [ ] PM2 管理器已安装
- [ ] PostgreSQL 已安装并创建数据库
- [ ] Redis 已安装
- [ ] LibreOffice 已安装
- [ ] 域名已解析到服务器 IP
- [ ] 阿里云 OSS 已创建并配置

### 部署过程

- [ ] 项目文件已上传/克隆
- [ ] 环境变量已配置（`.env.production`）
- [ ] 依赖已安装
- [ ] Prisma Client 已生成
- [ ] 数据库迁移已运行
- [ ] 项目已构建
- [ ] PM2 服务已启动（3个进程）
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
- [ ] PM2 开机自启已配置
- [ ] 数据库备份已设置
- [ ] 日志清理已设置

---

## 十六、快速命令参考

```bash
# 进入项目目录
cd /www/wwwroot/linklore

# PM2 管理
pm2 status                    # 查看状态
pm2 logs                      # 查看所有日志
pm2 restart all               # 重启所有服务
pm2 stop all                  # 停止所有服务
pm2 delete all                # 删除所有服务

# 数据库操作
psql -U linklore_user -d linklore  # 连接数据库
pg_dump -U linklore_user linklore > backup.sql  # 备份数据库

# Redis 操作
redis-cli                     # 连接 Redis
redis-cli ping                # 测试连接

# 查看日志
tail -f logs/web-out.log      # Web 应用日志
tail -f logs/worker-out.log   # Worker 日志
pm2 logs linklore-web         # PM2 日志

# 更新代码
git pull && pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm build && pm2 restart all
```

---

## 十七、技术支持与文档

- **项目文档**：查看 `README.md`
- **变更历史**：查看 `CHANGES_AI.md`
- **API 文档**：查看 `docs/API.md`
- **问题排查**：查看本文档的"常见问题排查"章节

---

**部署完成后，访问 `https://your-domain.com` 即可使用！**

**遇到问题？** 查看宝塔面板的日志或执行 `pm2 logs` 查看详细错误信息。





