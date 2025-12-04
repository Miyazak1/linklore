# LinkLore 宝塔面板快速部署

**适用**：使用宝塔面板的阿里云服务器  
**预计时间**：20-30 分钟

---

## 一、宝塔面板准备（5分钟）

### 1. 安装软件

在宝塔面板 **软件商店** 中安装：

1. **Node.js 版本管理器**
   - 安装后，安装 **Node.js 20.x**

2. **PM2 管理器**（推荐）
   - 或手动安装：在终端执行 `npm install -g pm2`

3. **Redis**（如果使用本地 Redis，不推荐）
   - 或使用阿里云 Redis（推荐）

4. **PostgreSQL**（如果使用本地数据库，不推荐）
   - 或使用阿里云 RDS（强烈推荐）

### 2. 安装系统依赖

在宝塔 **终端** 中执行：

```bash
# Alibaba Cloud Linux / CentOS
sudo yum install -y libreoffice-headless

# Ubuntu / Debian
sudo apt install -y libreoffice --no-install-recommends
```

---

## 二、上传项目（2分钟）

### 方式1：使用 Git（推荐）

在宝塔 **终端** 中：

```bash
cd /www/wwwroot
git clone <your-repo-url> linklore
cd linklore
```

### 方式2：使用文件管理器

1. 在宝塔 **文件** 中进入 `/www/wwwroot/`
2. 上传项目压缩包
3. 解压并重命名为 `linklore`

---

## 三、配置环境变量（3分钟）

1. 在宝塔 **文件管理器** 中，进入 `/www/wwwroot/linklore/apps/web/`
2. 创建文件 `.env.production`
3. 复制以下内容并修改：

```bash
DATABASE_URL="postgresql://username:password@your-rds-host:5432/linklore?sslmode=require"
SESSION_SECRET="生成32位随机字符串"
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
```

**生成 SESSION_SECRET**（在终端）：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 四、部署项目（5分钟）

在宝塔 **终端** 中执行：

```bash
cd /www/wwwroot/linklore

# 运行部署脚本
chmod +x infrastructure/scripts/deploy-bt.sh
./infrastructure/scripts/deploy-bt.sh
```

**或手动执行**：

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

## 五、配置 PM2（3分钟）

### 方式1：使用宝塔 PM2 管理器（推荐）

1. 打开 **软件商店** → **PM2 管理器**
2. 点击 **添加 Node 项目**

**项目1：linklore-web**
- 项目名称：`linklore-web`
- 项目路径：`/www/wwwroot/linklore`
- 启动文件：`pnpm`
- 项目参数：`--filter @linklore/web start`
- Node 版本：`20.x`
- 运行模式：`fork`
- 实例数量：`1`

**项目2：linklore-worker**
- 项目名称：`linklore-worker`
- 项目路径：`/www/wwwroot/linklore`
- 启动文件：`node`
- 项目参数：`./worker/ai-queue/dist/index.js`
- Node 版本：`20.x`
- 运行模式：`fork`
- 实例数量：`1`

### 方式2：使用命令行

```bash
cd /www/wwwroot/linklore
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

---

## 六、配置网站（5分钟）

### 1. 添加网站

1. 进入 **网站** → **添加站点**
2. 域名：`your-domain.com` 和 `www.your-domain.com`
3. 根目录：`/www/wwwroot/linklore`（或自定义）
4. PHP 版本：**纯静态**
5. 点击 **提交**

### 2. 配置反向代理

1. 点击域名右侧 **设置**
2. 进入 **反向代理** 标签
3. 点击 **添加反向代理**
4. 配置：
   - 代理名称：`linklore`
   - 目标 URL：`http://127.0.0.1:3000`
   - 发送域名：`$host`
5. 点击 **保存**

### 3. 配置 SSL 证书

1. 进入 **SSL** 标签
2. 选择 **Let's Encrypt**
3. 勾选域名
4. 点击 **申请**
5. 申请成功后，开启 **强制 HTTPS**

---

## 七、验证部署（2分钟）

1. **检查 PM2 状态**
   - 在 PM2 管理器中查看两个进程是否运行
   - 或执行：`pm2 status`

2. **访问网站**
   - 打开：`https://your-domain.com`
   - 应该看到聊天页面

3. **测试功能**
   - 匿名用户访问
   - 注册功能
   - 登录功能

---

## 八、常见问题

### PM2 无法启动

- 检查 Node.js 版本（需要 20.x）
- 检查项目路径
- 查看 PM2 日志

### 网站 502 错误

- 检查 PM2 是否运行：`pm2 status`
- 检查反向代理配置
- 查看 Nginx 错误日志：`/www/wwwlogs/your-domain.com.error.log`

### 数据库连接失败

- 检查 `.env.production` 中的 `DATABASE_URL`
- 如果使用 RDS，检查安全组白名单

---

## 九、更新代码

在宝塔终端中：

```bash
cd /www/wwwroot/linklore
git pull
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:migrate  # 如果有新迁移
pnpm build
pm2 restart ecosystem.config.js
```

---

**完成！访问 `https://your-domain.com` 即可使用！**

