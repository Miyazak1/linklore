# LinkLore 云服务器完全重置与重新部署方案

**目标**：完全清理云服务器上的 LinkLore 项目和相关数据，然后从零开始重新部署  
**环境**：阿里云服务器（4核8GB，5mbps）+ 宝塔面板  
**预计时间**：45-60 分钟  
**重要**：此操作只影响服务器，不会修改本地文件

---

## 一、目标（一句话）

完全清理服务器上的 LinkLore 项目、数据库、PM2 进程和相关配置，然后按照标准流程重新部署。

---

## 二、变更清单

### 服务器端操作（不涉及本地文件）

**需要清理的内容**：
- `/www/wwwroot/linklore` - 项目目录
- PostgreSQL 数据库 `linklore` 和用户 `linklore_user`
- PM2 进程（linklore-web, linklore-worker, linklore-baike-scheduler）
- 宝塔面板中的网站配置
- Nginx 反向代理配置
- 环境变量文件 `.env.production`

**需要重新创建的内容**：
- 项目目录（通过 Git 克隆）
- 数据库和用户
- 环境变量文件
- PM2 进程
- 网站和 Nginx 配置

---

## 三、实现方案（面向非程序员）

### 为什么需要重置？

1. **清理混乱状态**：之前的部署过程中遇到了多个问题（数据库迁移失败、构建错误等），导致服务器上的状态不一致
2. **从零开始更清晰**：完全清理后重新部署，可以确保每一步都正确执行
3. **避免残留问题**：旧的错误配置可能影响新部署

### 重置策略

1. **停止所有服务**：先停止 PM2 进程，避免文件被占用
2. **清理项目目录**：删除整个项目文件夹
3. **清理数据库**：删除数据库和用户，重新创建
4. **清理 PM2**：删除所有 PM2 进程
5. **清理网站配置**：删除宝塔面板中的网站和反向代理
6. **重新部署**：按照标准流程重新安装

### 风险说明

- **数据丢失**：重置会删除所有数据库数据，如果有重要数据需要先备份
- **服务中断**：重置期间网站无法访问
- **配置丢失**：所有自定义配置需要重新设置

### 回退方式

如果重置过程中出现问题，可以：
1. 停止当前操作
2. 从备份恢复（如果有）
3. 或者继续完成重置，然后重新部署

---

## 四、重置步骤（详细操作）

### 步骤 1：停止所有服务（2分钟）

在宝塔面板 **终端** 中执行：

```bash
# 停止所有 PM2 进程
pm2 stop all

# 查看状态确认已停止
pm2 status
```

**预期结果**：所有进程状态显示为 `stopped`

---

### 步骤 2：删除 PM2 进程（1分钟）

```bash
# 删除所有 PM2 进程
pm2 delete all

# 确认已删除
pm2 list
```

**预期结果**：`PM2 process list is empty`

---

### 步骤 3：清理项目目录（1分钟）

```bash
# 进入项目目录的父目录
cd /www/wwwroot

# 查看当前目录，确认项目目录名称
ls -la

# 删除项目目录（根据实际目录名，可能是 linklore 或 www.linkloredu.com）
rm -rf www.linkloredu.com
# 或者如果目录名是 linklore：
# rm -rf linklore

# 确认已删除
ls -la | grep -E "linklore|www.linkloredu"
```

**预期结果**：没有包含 `linklore` 的目录

---

### 步骤 4：清理数据库（3分钟）

#### 4.1 在宝塔面板中删除数据库

1. 进入 **数据库** 菜单
2. 找到 `linklore` 数据库
3. 点击右侧的 **删除** 按钮
4. 确认删除

#### 4.2 删除数据库用户（可选，如果单独创建了用户）

在宝塔面板 **终端** 中执行：

```bash
# 连接 PostgreSQL（使用 postgres 用户）
sudo -u postgres psql

# 在 psql 中执行（如果用户存在）
DROP USER IF EXISTS linklore_user;

# 退出 psql
\q
```

**预期结果**：数据库和用户已删除

---

### 步骤 5：清理网站配置（2分钟）

#### 5.1 删除网站

1. 进入 **网站** 菜单
2. 找到你的域名（如 `www.linkloredu.com`）
3. 点击右侧的 **删除** 按钮
4. 确认删除（选择删除网站目录，如果提示）

#### 5.2 清理 Nginx 配置（可选）

如果删除网站后还有残留配置，可以手动清理：

```bash
# 查看 Nginx 配置目录
ls -la /www/server/panel/vhost/nginx/

# 如果有残留配置文件，可以删除（谨慎操作）
# rm /www/server/panel/vhost/nginx/your-domain.com.conf
```

**预期结果**：网站已从列表中删除

---

### 步骤 6：验证清理完成（1分钟）

```bash
# 检查项目目录
ls -la /www/wwwroot/ | grep linklore

# 检查 PM2 进程
pm2 list

# 检查端口占用（应该没有 3000 端口）
netstat -tlnp | grep 3000
```

**预期结果**：
- 没有 `linklore` 目录
- PM2 列表为空
- 没有 3000 端口占用

---

## 五、重新部署步骤（从零开始）

### 步骤 7：重新创建数据库（5分钟）

#### 7.1 在宝塔面板中创建数据库

1. 进入 **数据库** 菜单
2. 点击 **添加数据库**
3. 配置：
   - **数据库名**：`linklore`
   - **用户名**：`linklore_user`
   - **密码**：**生成强密码并记录**（建议使用：`a8rEczHFnMGm` 或生成新的）
   - **访问权限**：`本地服务器`
4. 点击 **提交**

#### 7.2 记录数据库连接信息

记录以下信息，后续配置环境变量需要：

```
数据库主机：localhost
数据库端口：5432
数据库名：linklore
用户名：linklore_user
密码：你设置的密码
```

---

### 步骤 8：克隆项目（3分钟）

在宝塔面板 **终端** 中执行：

```bash
# 进入网站根目录
cd /www/wwwroot

# 克隆项目（使用你的 GitHub 仓库）
git clone https://github.com/Miyazak1/linklore.git linklore

# 进入项目目录
cd linklore

# 确认克隆成功
ls -la
```

**预期结果**：能看到项目文件和目录

---

### 步骤 9：配置环境变量（10分钟）

#### 9.1 创建环境变量文件

在宝塔面板 **文件管理器** 中：

1. 进入 `/www/wwwroot/linklore/apps/web/` 目录
2. 点击 **新建** → **文件**
3. 文件名：`.env.production`
4. 点击 **创建**

#### 9.2 编辑环境变量

点击 `.env.production` 文件，在编辑器中填入以下内容：

```bash
# ============================================
# 数据库配置
# ============================================
DATABASE_URL="postgresql://linklore_user:你的数据库密码@localhost:5432/linklore"

# ============================================
# 会话密钥（必需，至少32字符）
# ============================================
# 在终端执行以下命令生成：
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET="在这里填入生成的32位随机字符串"

# ============================================
# Redis 配置
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
# AI 配置（硅基流动 + DeepSeek-V3）
# ============================================
AI_DEFAULT_PROVIDER="siliconflow"
AI_DEFAULT_MODEL="DeepSeek-V3"
AI_ALLOWED_PROVIDERS="openai,qwen,siliconflow"
AI_FALLBACK_PROVIDER="siliconflow"
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
NEXT_PUBLIC_APP_URL="https://你的域名.com"
```

#### 9.3 生成 SESSION_SECRET

在宝塔面板 **终端** 中执行：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制输出的字符串，替换 `.env.production` 中的 `SESSION_SECRET` 值。

#### 9.4 替换占位符

**必须替换的值**：
- `你的数据库密码` → 步骤 7.1 中设置的密码
- `你的Redis密码` → Redis 密码（如果设置了）
- `你的AccessKey ID` → 阿里云 OSS AccessKey ID
- `你的AccessKey Secret` → 阿里云 OSS AccessKey Secret
- `你的Bucket名称` → 阿里云 OSS Bucket 名称
- `你的域名.com` → 你的实际域名

---

## 六、安装依赖和构建（15-20分钟）

### 步骤 10：安装 pnpm 和项目依赖（5分钟）

在宝塔面板 **终端** 中执行：

```bash
# 进入项目目录
cd /www/wwwroot/linklore

# 启用 pnpm（如果还没启用）
corepack enable
corepack prepare pnpm@9.0.0 --activate

# 验证 pnpm 安装
pnpm --version

# 安装项目依赖（这可能需要几分钟）
pnpm install --frozen-lockfile
```

**预期结果**：
- pnpm 版本显示为 `9.0.0` 或更高
- 依赖安装完成，没有错误

**如果遇到错误**：
- 检查网络连接
- 如果 `corepack` 命令失败，可以手动安装：`npm install -g pnpm@9.0.0`

---

### 步骤 11：生成 Prisma Client 和运行数据库迁移（5分钟）

```bash
# 确保在项目根目录
cd /www/wwwroot/linklore

# 生成 Prisma Client
pnpm prisma:generate

# 运行数据库迁移（创建表结构）
pnpm prisma:migrate
```

**预期结果**：
- Prisma Client 生成成功
- 数据库迁移完成，所有表已创建

**如果迁移失败**：
- 检查 `.env.production` 中的 `DATABASE_URL` 是否正确
- 检查数据库是否已创建
- 查看错误信息，可能需要手动处理

---

### 步骤 12：构建项目（5-10分钟）

```bash
# 确保在项目根目录
cd /www/wwwroot/linklore

# 构建项目（这可能需要几分钟）
pnpm --filter @linklore/web build
```

**预期结果**：
- 构建成功，显示 `✓ Compiled successfully` 或类似信息
- 没有 TypeScript 错误或构建错误

**如果构建失败**：
- 查看错误信息，通常是代码问题
- 检查 `.env.production` 文件格式是否正确
- 确保所有依赖都已安装

---

### 步骤 13：配置 PM2 进程管理（5分钟）

#### 13.1 方式1：使用宝塔 PM2 管理器（推荐）

1. 打开 **软件商店** → **PM2 管理器**
2. 点击 **添加 Node 项目**

**项目1：linklore-web（Web 应用）**

- **项目名称**：`linklore-web`
- **项目路径**：`/www/wwwroot/linklore`
- **启动文件**：`pnpm`
- **项目参数**：`--filter @linklore/web start`
- **运行目录**：`/www/wwwroot/linklore`
- **Node 版本**：选择 `20.x`
- **运行模式**：`fork`
- **实例数量**：`1`
- **环境变量**：从 `.env.production` 自动读取（或手动添加）

**项目2：linklore-worker（Worker 进程）**

- **项目名称**：`linklore-worker`
- **项目路径**：`/www/wwwroot/linklore`
- **启动文件**：`node`
- **项目参数**：`./worker/ai-queue/dist/index.js`
- **运行目录**：`/www/wwwroot/linklore`
- **Node 版本**：选择 `20.x`
- **运行模式**：`fork`
- **实例数量**：`1`
- **环境变量**：从 `.env.production` 自动读取

**项目3：linklore-baike-scheduler（定时任务）**

- **项目名称**：`linklore-baike-scheduler`
- **项目路径**：`/www/wwwroot/linklore`
- **启动文件**：`pnpm`
- **项目参数**：`--filter @linklore/web baike:schedule`
- **运行目录**：`/www/wwwroot/linklore`
- **Node 版本**：选择 `20.x`
- **运行模式**：`fork`
- **实例数量**：`1`
- **环境变量**：从 `.env.production` 自动读取

#### 13.2 方式2：使用命令行 PM2

如果使用命令行，在终端执行：

```bash
cd /www/wwwroot/linklore

# 启动所有服务（如果有 ecosystem.config.js）
pm2 start ecosystem.config.js

# 或手动启动
pm2 start pnpm --name linklore-web -- --filter @linklore/web start
pm2 start node --name linklore-worker -- ./worker/ai-queue/dist/index.js
pm2 start pnpm --name linklore-baike-scheduler -- --filter @linklore/web baike:schedule

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

#### 13.3 验证 PM2 状态

```bash
pm2 status
```

**预期结果**：应该看到 3 个进程都在运行：
- `linklore-web` - 状态为 `online`
- `linklore-worker` - 状态为 `online`
- `linklore-baike-scheduler` - 状态为 `online`

---

### 步骤 14：配置网站和 Nginx（10分钟）

#### 14.1 添加网站

1. 进入 **网站** 菜单
2. 点击 **添加站点**
3. 配置：
   - **域名**：`your-domain.com` 和 `www.your-domain.com`（两个都添加）
   - **根目录**：`/www/wwwroot/linklore`（或自定义）
   - **PHP 版本**：**纯静态**（不需要 PHP）
   - **其他选项**：保持默认
4. 点击 **提交**

#### 14.2 配置反向代理

1. 在网站列表中，点击你的域名右侧的 **设置**
2. 进入 **反向代理** 标签
3. 点击 **添加反向代理**
4. 配置：
   - **代理名称**：`linklore`
   - **目标 URL**：`http://127.0.0.1:3000`
   - **发送域名**：`$host`
   - **其他选项**：保持默认
5. 点击 **保存**

#### 14.3 配置 SSL 证书（HTTPS，可选）

1. 在网站设置中，进入 **SSL** 标签
2. 选择 **Let's Encrypt**（免费证书）
3. 勾选你的域名（`your-domain.com` 和 `www.your-domain.com`）
4. 点击 **申请**
5. 等待申请完成（约1-2分钟）
6. 申请成功后，开启 **强制 HTTPS**

#### 14.4 优化 Nginx 配置（可选）

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

## 七、测试步骤（5分钟）

### 步骤 15：验证部署

#### 15.1 检查服务状态

在终端执行：

```bash
# 检查 PM2 状态
pm2 status

# 检查端口占用
netstat -tlnp | grep 3000

# 检查进程
ps aux | grep node
```

**预期结果**：
- PM2 显示 3 个进程都在运行
- 端口 3000 被占用（说明应用正在运行）
- 有 Node.js 进程在运行

#### 15.2 访问网站

1. 打开浏览器访问：`https://your-domain.com`（或 `http://your-domain.com` 如果还没配置 SSL）
2. 应该看到应用首页

#### 15.3 健康检查

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

#### 15.4 测试功能

- 匿名用户访问（应该可以正常浏览）
- 注册功能（需要邀请码）
- 登录功能
- 聊天功能（如果已配置 AI）

---

## 八、回退与已知问题

### 回退方式

如果在重置过程中出现问题：

1. **停止当前操作**：按 `Ctrl+C` 停止正在执行的命令
2. **检查状态**：执行 `pm2 status`、`ls -la /www/wwwroot/` 查看当前状态
3. **继续完成重置**：完成所有清理步骤，然后重新部署

### 已知问题

1. **数据库密码**：如果忘记密码，可以在宝塔面板中重置
2. **Git 克隆失败**：检查网络连接和仓库权限
3. **环境变量格式错误**：确保没有多余的空格和引号

---

---

## 九、快速参考命令

```bash
# 进入项目目录
cd /www/wwwroot/linklore

# PM2 管理
pm2 status                    # 查看状态
pm2 logs                      # 查看所有日志
pm2 restart all               # 重启所有服务
pm2 stop all                  # 停止所有服务

# 查看日志
pm2 logs linklore-web         # Web 应用日志
pm2 logs linklore-worker      # Worker 日志

# 更新代码
git pull && pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm --filter @linklore/web build && pm2 restart all
```

---

## 十、部署检查清单

### 重置阶段（已完成 ✅）

- [x] 停止所有 PM2 进程
- [x] 删除 PM2 进程
- [x] 清理项目目录
- [x] 清理数据库（可选）
- [x] 清理网站配置
- [x] 验证清理完成

### 重新部署阶段（进行中）

- [ ] 重新创建数据库
- [ ] 克隆项目
- [ ] 配置环境变量
- [ ] 安装依赖
- [ ] 生成 Prisma Client
- [ ] 运行数据库迁移
- [ ] 构建项目
- [ ] 配置 PM2 进程
- [ ] 配置网站和 Nginx
- [ ] 验证部署

---

**下一步**：现在可以开始执行步骤 7（重新创建数据库），然后继续步骤 8-14 完成重新部署。

