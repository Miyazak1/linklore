# 当前部署步骤（基于服务器状态）

**当前状态**：
- ✅ Node.js v20.19.6 已安装
- ✅ pnpm 9.0.0 已安装
- ✅ PM2 6.0.14 已安装
- ✅ PostgreSQL 运行中
- ✅ Redis 运行中
- ✅ 当前在 /www/wwwroot/linklore 目录

---

## 第一步：检查项目状态

在宝塔面板终端执行：

```bash
# 检查当前目录
pwd

# 检查是否是 git 仓库
git status

# 检查是否有 .env.production 文件
ls -la apps/web/.env.production
```

---

## 第二步：更新代码（如果项目已存在）

```bash
# 拉取最新代码
git pull origin master
```

---

## 第三步：配置环境变量

如果 `.env.production` 不存在或需要更新：

```bash
cd /www/wwwroot/linklore

# 创建环境变量文件
cat > apps/web/.env.production << 'EOF'
DATABASE_URL="postgresql://linklore_user:a8rEczHFnMGm@localhost:5432/linklore"
SESSION_SECRET="f76f56f9172adf4561605d160d82f05fb87f58598537678930b3196ddbaeb5b3"
REDIS_URL="redis://localhost:6379/0"
OSS_REGION="oss-cn-hongkong"
OSS_ACCESS_KEY_ID="你的阿里云AccessKey ID"
OSS_ACCESS_KEY_SECRET="你的阿里云AccessKey Secret"
OSS_BUCKET="你的OSS Bucket名称"
AI_DEFAULT_PROVIDER="siliconflow"
AI_DEFAULT_MODEL="DeepSeek-V3"
AI_ALLOWED_PROVIDERS="openai,qwen,siliconflow"
AI_FALLBACK_PROVIDER="siliconflow"
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50
QUEUE_CONCURRENCY=1
MAX_FILE_SIZE_MB=20
ALLOWED_EXT="doc,docx,txt,md"
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL="http://www.linkloredu.com"
EOF
```

**重要**：需要手动编辑文件，替换：
- `你的阿里云AccessKey ID`
- `你的阿里云AccessKey Secret`
- `你的OSS Bucket名称`

---

## 第四步：检查数据库

```bash
# 测试数据库连接
PGPASSWORD='a8rEczHFnMGm' psql -U linklore_user -h localhost -d linklore -c "SELECT version();"
```

如果数据库不存在，需要在宝塔面板中创建。

---

## 第五步：安装依赖和构建

```bash
cd /www/wwwroot/linklore

# 1. 启用 pnpm（如果还没启用）
corepack enable
corepack prepare pnpm@9.0.0 --activate

# 2. 安装依赖
pnpm install --frozen-lockfile

# 3. 生成 Prisma Client
pnpm prisma:generate

# 4. 运行数据库迁移
pnpm prisma:migrate

# 5. 构建项目
pnpm build
```

---

## 第六步：配置 PM2

```bash
cd /www/wwwroot/linklore

# 创建 PM2 配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'linklore-web',
      script: 'pnpm',
      args: '--filter @linklore/web start',
      cwd: '/www/wwwroot/linklore',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G'
    },
    {
      name: 'linklore-worker',
      script: 'pnpm',
      args: '--filter @linklore/worker start',
      cwd: '/www/wwwroot/linklore',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '512M'
    }
  ]
};
EOF

# 创建日志目录
mkdir -p logs

# 停止旧进程（如果有）
pm2 stop all
pm2 delete all

# 启动新进程
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 保存配置
pm2 save
pm2 startup
```

---

## 第七步：配置 Nginx

在宝塔面板中：
1. 网站 → 添加站点
2. 域名：`www.linkloredu.com`
3. 根目录：`/www/wwwroot/linklore/apps/web/public`
4. 添加反向代理：`http://127.0.0.1:3000`

---

## 第八步：验证

```bash
# 检查 PM2 状态
pm2 status

# 检查端口
netstat -tlnp | grep 3000

# 查看日志
pm2 logs linklore-web --lines 50
```





