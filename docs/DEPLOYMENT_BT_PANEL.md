# LinkLore 宝塔面板部署指南

**目标环境**：阿里云服务器（2核4GB）+ 宝塔面板  
**部署方式**：PM2 进程管理 + 宝塔 Nginx

---

## 一、宝塔面板准备

### 1.1 安装宝塔面板

如果还没有安装宝塔面板：

```bash
# CentOS/RedHat
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh

# Ubuntu/Debian
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh
```

安装完成后，记录：
- 面板地址：`http://your-server-ip:8888`
- 用户名和密码

### 1.2 登录宝塔面板

1. 访问：`http://your-server-ip:8888`
2. 使用安装时记录的用户名和密码登录
3. 首次登录会提示安装 LNMP 或 LAMP，选择 **LNMP**

---

## 二、宝塔面板环境配置

### 2.1 安装软件

在宝塔面板中安装以下软件：

1. **Node.js 版本管理器**
   - 路径：软件商店 → 运行环境 → Node.js 版本管理器
   - 安装后，安装 **Node.js 20.x** 版本

2. **PM2 管理器**（推荐）
   - 路径：软件商店 → 运行环境 → PM2 管理器
   - 或手动安装：`npm install -g pm2`

3. **Redis**（如果使用本地 Redis）
   - 路径：软件商店 → 运行环境 → Redis
   - 或使用云 Redis（推荐）

4. **PostgreSQL**（如果使用本地数据库）
   - 路径：软件商店 → 数据库 → PostgreSQL
   - 或使用阿里云 RDS（强烈推荐）

5. **Nginx**（通常已安装）
   - 确认已安装并运行

### 2.2 安装系统依赖

在宝塔面板终端或 SSH 中执行：

```bash
# 安装 LibreOffice（用于文档处理）
# CentOS/Alibaba Cloud Linux
sudo yum install -y libreoffice-headless

# Ubuntu/Debian
sudo apt install -y libreoffice --no-install-recommends
```

---

## 三、项目部署

### 3.1 上传项目文件

**方式1：使用宝塔文件管理器**

1. 登录宝塔面板
2. 进入 **文件** 菜单
3. 进入 `/www/wwwroot/` 目录
4. 上传项目压缩包并解压，或使用 Git 克隆

**方式2：使用 Git（推荐）**

在宝塔终端中执行：

```bash
cd /www/wwwroot
git clone <your-repo-url> linklore
cd linklore
```

### 3.2 配置环境变量

1. 在宝塔文件管理器中，进入 `/www/wwwroot/linklore/apps/web/`
2. 创建文件 `.env.production`
3. 编辑文件，填入以下内容：

```bash
# 数据库配置（推荐使用 RDS）
DATABASE_URL="postgresql://username:password@your-rds-host:5432/linklore?sslmode=require"

# 会话密钥（在终端生成：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET="your-production-secret-key-at-least-32-chars"

# Redis 配置（推荐使用云 Redis）
REDIS_URL="redis://:password@your-redis-host:6379/0"

# 阿里云 OSS 配置
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="your-access-key-id"
OSS_ACCESS_KEY_SECRET="your-access-key-secret"
OSS_BUCKET="your-bucket-name"

# AI 配置
AI_DEFAULT_PROVIDER="openai"
AI_ALLOWED_PROVIDERS="openai,qwen"
AI_FALLBACK_PROVIDER="qwen"
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50

# 队列配置
QUEUE_CONCURRENCY=1

# 文件上传配置
MAX_FILE_SIZE_MB=20
ALLOWED_EXT="doc,docx,txt,md"

# 生产环境配置
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

**重要**：替换所有占位符为实际值！

### 3.3 安装依赖和构建

在宝塔终端中执行：

```bash
cd /www/wwwroot/linklore

# 启用 pnpm
corepack enable
corepack prepare pnpm@9.0.0 --activate

# 安装依赖
pnpm install --frozen-lockfile

# 生成 Prisma Client
pnpm prisma:generate

# 运行数据库迁移
pnpm prisma:migrate

# 构建项目
pnpm build

# 创建日志目录
mkdir -p logs
```

---

## 四、配置 PM2（使用宝塔 PM2 管理器）

### 4.1 方式1：使用宝塔 PM2 管理器（推荐）

1. 打开 **软件商店** → **PM2 管理器**
2. 点击 **添加 Node 项目**
3. 配置如下：

**项目1：Web 应用**
- 项目名称：`linklore-web`
- 项目路径：`/www/wwwroot/linklore`
- 启动文件：`pnpm`
- 运行目录：`/www/wwwroot/linklore`
- 项目参数：`--filter @linklore/web start`
- Node 版本：选择 Node.js 20.x
- 运行模式：`fork`
- 实例数量：`1`
- 环境变量：从 `.env.production` 读取（或手动添加）

**项目2：Worker 进程**
- 项目名称：`linklore-worker`
- 项目路径：`/www/wwwroot/linklore`
- 启动文件：`node`
- 运行目录：`/www/wwwroot/linklore`
- 项目参数：`./worker/ai-queue/dist/index.js`
- Node 版本：选择 Node.js 20.x
- 运行模式：`fork`
- 实例数量：`1`
- 环境变量：从 `.env.production` 读取（或手动添加）

### 4.2 方式2：使用命令行 PM2

在宝塔终端中执行：

```bash
cd /www/wwwroot/linklore

# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

---

## 五、配置网站（宝塔面板）

### 5.1 添加网站

1. 进入 **网站** 菜单
2. 点击 **添加站点**
3. 配置：
   - 域名：`your-domain.com` 和 `www.your-domain.com`
   - 根目录：`/www/wwwroot/linklore`（或自定义）
   - PHP 版本：**纯静态**（不需要 PHP）
   - 其他选项保持默认

### 5.2 配置 SSL 证书

1. 在网站列表中，点击你的域名右侧的 **设置**
2. 进入 **SSL** 标签
3. 选择 **Let's Encrypt**（免费）
4. 勾选域名，点击 **申请**
5. 申请成功后，开启 **强制 HTTPS**

### 5.3 配置反向代理

1. 在网站设置中，进入 **反向代理** 标签
2. 点击 **添加反向代理**
3. 配置：
   - 代理名称：`linklore`
   - 目标 URL：`http://127.0.0.1:3000`
   - 发送域名：`$host`
   - 其他保持默认
4. 点击 **保存**

### 5.4 修改 Nginx 配置（可选，如果需要自定义）

1. 在网站设置中，进入 **配置文件** 标签
2. 在 `location /` 块中添加或修改：

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

3. 点击 **保存**，然后 **重载配置**

---

## 六、配置防火墙

### 6.1 宝塔面板防火墙

1. 进入 **安全** 菜单
2. 确保以下端口已开放：
   - `80` (HTTP)
   - `443` (HTTPS)
   - `22` (SSH)
   - `3000` (Next.js，仅本地访问，不需要对外开放)

### 6.2 阿里云安全组

在阿里云控制台配置安全组规则：
- 入方向：允许 `80`、`443`、`22` 端口

---

## 七、验证部署

### 7.1 检查服务状态

在宝塔面板中：

1. **PM2 管理器**：查看两个进程是否运行
2. **网站**：查看网站状态是否正常
3. **终端**：执行 `pm2 status` 查看状态

### 7.2 访问网站

1. 打开浏览器访问：`https://your-domain.com`
2. 应该自动跳转到聊天页面
3. 测试功能：
   - 匿名用户访问
   - 注册功能
   - 登录功能
   - 聊天功能

### 7.3 健康检查

访问：`https://your-domain.com/api/health`

应该返回：
```json
{
  "ok": true,
  "db": "up",
  "queue": { "status": "up", ... },
  "traceSystem": { "healthy": true, ... }
}
```

---

## 八、宝塔面板特定操作

### 8.1 查看日志

**方式1：使用宝塔面板**
- PM2 管理器 → 点击项目 → 查看日志

**方式2：使用文件管理器**
- 日志位置：`/www/wwwroot/linklore/logs/`
- `web-out.log` - Web 应用输出日志
- `web-error.log` - Web 应用错误日志
- `worker-out.log` - Worker 输出日志
- `worker-error.log` - Worker 错误日志

**方式3：使用终端**
```bash
pm2 logs linklore-web
pm2 logs linklore-worker
```

### 8.2 重启服务

**方式1：使用 PM2 管理器**
- 点击项目右侧的 **重启** 按钮

**方式2：使用终端**
```bash
pm2 restart linklore-web
pm2 restart linklore-worker
# 或
pm2 restart ecosystem.config.js
```

### 8.3 更新代码

```bash
cd /www/wwwroot/linklore

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

---

## 九、常见问题

### 问题1：PM2 管理器无法启动项目

**解决方案**：
1. 检查 Node.js 版本是否正确（需要 20.x）
2. 检查项目路径是否正确
3. 检查启动文件路径
4. 查看错误日志

### 问题2：网站 502 错误

**可能原因**：
1. Next.js 应用未启动
2. 端口 3000 被占用
3. 反向代理配置错误

**排查步骤**：
```bash
# 检查 PM2 状态
pm2 status

# 检查端口
netstat -tlnp | grep 3000

# 检查 Nginx 错误日志
tail -f /www/wwwlogs/your-domain.com.error.log
```

### 问题3：数据库连接失败

**解决方案**：
1. 检查 `.env.production` 中的 `DATABASE_URL`
2. 如果使用 RDS，检查安全组白名单（添加服务器 IP）
3. 测试连接：
   ```bash
   psql "postgresql://username:password@host:5432/linklore"
   ```

### 问题4：SSL 证书申请失败

**解决方案**：
1. 确保域名已正确解析到服务器 IP
2. 确保 80 端口已开放
3. 在宝塔面板中手动申请证书

---

## 十、宝塔面板优化建议

### 10.1 计划任务

在宝塔面板中设置计划任务：

1. **数据库备份**（如果使用本地数据库）
   - 任务类型：Shell 脚本
   - 执行周期：每天
   - 脚本内容：
     ```bash
     pg_dump "postgresql://..." > /www/backup/db_$(date +%Y%m%d).sql
     ```

2. **日志清理**
   - 任务类型：Shell 脚本
   - 执行周期：每周
   - 脚本内容：
     ```bash
     find /www/wwwroot/linklore/logs -name "*.log" -mtime +7 -delete
     ```

### 10.2 监控设置

1. 在宝塔面板中启用 **系统监控**
2. 设置告警阈值（如 CPU > 80%, 内存 > 90%）

### 10.3 性能优化

1. **开启 Nginx 缓存**（在网站设置中）
2. **开启 Gzip 压缩**（通常已默认开启）
3. **使用 CDN**（如果适用）

---

## 十一、快速部署检查清单

### 部署前
- [ ] 宝塔面板已安装
- [ ] Node.js 20.x 已安装
- [ ] PM2 管理器已安装（或已安装 PM2）
- [ ] 域名已解析到服务器 IP
- [ ] 云数据库（RDS）已创建（推荐）
- [ ] 云 Redis 已创建（推荐）
- [ ] 阿里云 OSS 已创建

### 部署中
- [ ] 项目文件已上传/克隆
- [ ] 环境变量已配置（`.env.production`）
- [ ] 依赖已安装
- [ ] Prisma Client 已生成
- [ ] 数据库迁移已运行
- [ ] 项目已构建
- [ ] PM2 服务已启动
- [ ] 网站已添加
- [ ] SSL 证书已配置
- [ ] 反向代理已配置

### 部署后
- [ ] 网站可以访问（HTTPS）
- [ ] 健康检查通过
- [ ] 匿名用户功能正常
- [ ] 注册/登录功能正常
- [ ] 聊天功能正常
- [ ] PM2 开机自启已配置

---

## 十二、宝塔面板专用脚本

如果需要，可以在宝塔面板的 **计划任务** 中设置自动部署：

```bash
#!/bin/bash
cd /www/wwwroot/linklore
git pull
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:migrate
pnpm build
pm2 restart ecosystem.config.js
```

---

**部署完成后，访问 `https://your-domain.com` 即可使用！**

**遇到问题？** 查看宝塔面板的日志或执行 `pm2 logs` 查看详细错误信息。

