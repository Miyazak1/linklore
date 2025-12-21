# LinkLore 当前部署步骤（宝塔面板）

**当前状态**：代码已推送到 GitHub，准备在服务器上部署  
**部署方式**：宝塔面板终端  
**预计时间**：30-40 分钟

---

## 第一步：检查服务器环境（5分钟）

在宝塔面板 **终端** 中执行以下命令，检查环境：

```bash
# 检查 Node.js 版本（应该是 20.x）
node -v

# 检查 pnpm 是否可用
pnpm --version

# 检查 PM2 是否安装
pm2 -v

# 检查 PostgreSQL 是否运行
systemctl status postgresql

# 检查 Redis 是否运行
systemctl status redis
```

**预期结果**：
- Node.js: `v20.x.x`
- pnpm: `9.0.0` 或更高
- PM2: 已安装
- PostgreSQL: `active (running)`
- Redis: `active (running)`

---

## 第二步：克隆或更新项目（5分钟）

### 如果项目目录不存在，克隆项目：

```bash
# 进入网站目录
cd /www/wwwroot

# 克隆项目
git clone https://github.com/Miyazak1/linklore.git

# 进入项目目录
cd linklore
```

### 如果项目目录已存在，更新代码：

```bash
# 进入项目目录
cd /www/wwwroot/linklore

# 拉取最新代码
git pull origin master
```

---

## 第三步：配置环境变量（5分钟）

### 3.1 创建环境变量文件

```bash
cd /www/wwwroot/linklore

# 复制环境变量模板（如果存在）
# cp apps/web/.env.production.example apps/web/.env.production

# 创建环境变量文件
nano apps/web/.env.production
```

### 3.2 填写环境变量

将以下内容复制到文件中，**替换**相应的值：

```bash
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
```

**重要**：需要替换的值：
- `你的阿里云AccessKey ID` → 你的实际 AccessKey ID
- `你的阿里云AccessKey Secret` → 你的实际 AccessKey Secret
- `你的OSS Bucket名称` → 你的实际 Bucket 名称

### 3.3 保存文件

- 按 `Ctrl + O` 保存
- 按 `Enter` 确认
- 按 `Ctrl + X` 退出

---

## 第四步：创建数据库（5分钟）

### 4.1 在宝塔面板中创建数据库

1. 登录宝塔面板
2. 点击左侧菜单 **数据库**
3. 点击 **添加数据库** 按钮
4. 填写信息：
   - **数据库名**：`linklore`
   - **用户名**：`linklore_user`
   - **密码**：`a8rEczHFnMGm`
   - **访问权限**：本地服务器
5. 点击 **提交**

### 4.2 验证数据库创建

在宝塔面板 **终端** 中执行：

```bash
# 测试数据库连接
PGPASSWORD='a8rEczHFnMGm' psql -U linklore_user -h localhost -d linklore -c "SELECT version();"
```

**预期结果**：显示 PostgreSQL 版本信息

---

## 第五步：安装依赖和构建（10分钟）

在宝塔面板 **终端** 中执行：

```bash
cd /www/wwwroot/linklore

# 1. 启用 pnpm
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

**注意**：
- 每一步执行完成后，再执行下一步
- 如果某一步报错，请告诉我错误信息
- 构建过程可能需要 5-10 分钟

---

## 第六步：配置 PM2 进程（5分钟）

### 6.1 创建 PM2 配置文件

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
```

### 6.2 启动 PM2 进程

```bash
# 启动所有进程
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 保存 PM2 配置（开机自启）
pm2 save
pm2 startup
```

**预期结果**：
- `linklore-web`: `online`
- `linklore-worker`: `online`

---

## 第七步：配置 Nginx 反向代理（5分钟）

### 7.1 在宝塔面板中创建网站

1. 登录宝塔面板
2. 点击左侧菜单 **网站**
3. 点击 **添加站点** 按钮
4. 填写信息：
   - **域名**：`www.linkloredu.com`
   - **根目录**：`/www/wwwroot/linklore/apps/web/public`（临时，稍后会修改）
   - **PHP 版本**：纯静态
5. 点击 **提交**

### 7.2 配置反向代理

1. 在 **网站** 列表中，找到 `www.linkloredu.com`，点击 **设置**
2. 点击 **反向代理** 标签
3. 点击 **添加反向代理** 按钮
4. 填写信息：
   - **代理名称**：`linklore`
   - **目标URL**：`http://127.0.0.1:3000`
   - **发送域名**：`$host`
   - **缓存**：关闭
5. 点击 **提交**

### 7.3 修改网站配置

1. 在网站设置页面，点击 **配置文件** 标签
2. 找到 `root` 配置，修改为：
   ```nginx
   root /www/wwwroot/linklore/apps/web/public;
   ```
3. 在 `location /` 块中添加：
   ```nginx
   location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_cache_bypass $http_upgrade;
   }
   ```
4. 点击 **保存**

### 7.4 测试配置

```bash
# 测试 Nginx 配置
nginx -t

# 如果测试通过，重启 Nginx
systemctl restart nginx
```

---

## 第八步：验证部署（5分钟）

### 8.1 检查服务状态

```bash
# 检查 PM2 进程
pm2 status

# 检查 Nginx 状态
systemctl status nginx

# 检查端口占用
netstat -tlnp | grep 3000
```

### 8.2 访问网站

在浏览器中访问：`http://www.linkloredu.com`

**预期结果**：
- 网站可以正常访问
- 没有错误页面
- 可以正常浏览

---

## 故障排查

如果遇到问题：

1. **PM2 进程启动失败**
   ```bash
   # 查看日志
   pm2 logs linklore-web
   pm2 logs linklore-worker
   ```

2. **Nginx 502 错误**
   - 检查 PM2 进程是否运行：`pm2 status`
   - 检查端口 3000 是否监听：`netstat -tlnp | grep 3000`
   - 检查防火墙是否开放端口

3. **数据库连接失败**
   - 检查数据库是否运行：`systemctl status postgresql`
   - 检查环境变量中的数据库连接字符串是否正确

4. **构建失败**
   - 检查 Node.js 版本：`node -v`（应该是 20.x）
   - 检查依赖是否安装：`pnpm list`
   - 查看构建日志中的具体错误信息

---

**部署完成后，告诉我结果！**

