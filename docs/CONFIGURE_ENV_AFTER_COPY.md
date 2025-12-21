# 复制完成后配置环境变量

## 当前状态

✅ 项目文件已成功复制到 `/www/wwwroot/wwwroot/www.linkloredu.com`

从 `ls -la` 输出可以看到：
- ✅ `apps/` 目录存在
- ✅ `infrastructure/` 目录存在
- ✅ `.git/` 目录存在
- ✅ 各种配置文件存在

---

## 下一步：配置环境变量

### 方法 1：使用宝塔面板文件管理器（推荐）

1. **刷新文件管理器**（如果还没刷新）
2. **导航到环境变量文件**：
   - 点击 `apps` 文件夹
   - 点击 `web` 文件夹
   - 查找 `.env.production` 文件

3. **如果文件不存在，创建它**：
   - 在 `web` 目录中，点击 **新建** → **文件**
   - 文件名：`.env.production`
   - 点击 **创建**

4. **编辑文件**：
   - 点击 `.env.production` 文件名
   - 在右侧编辑器中，添加以下内容：

```bash
NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"
```

5. **保存**：点击 **保存** 按钮

### 方法 2：使用终端命令

```bash
# 进入项目目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 创建环境变量文件（如果不存在）
touch apps/web/.env.production

# 添加配置
echo 'NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"' > apps/web/.env.production

# 验证
cat apps/web/.env.production
```

---

## 完整环境变量配置（如果需要）

如果还需要其他配置，可以添加：

```bash
# 应用 URL（必须！）
NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"

# 数据库连接
DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/linklore?sslmode=require"

# 会话密钥（至少32字符）
# 生成方式：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET="你的32位以上随机字符串"

# Redis 连接
REDIS_URL="redis://:密码@Redis地址:6379/0"

# 阿里云 OSS 配置
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="你的AccessKey ID"
OSS_ACCESS_KEY_SECRET="你的AccessKey Secret"
OSS_BUCKET="你的Bucket名称"
```

**注意**：如果数据库和 Redis 还没配置，可以先只配置 `NEXT_PUBLIC_APP_URL`，其他配置后续再添加。

---

## 验证环境变量文件

配置完成后，验证：

```bash
# 查看文件内容
cat apps/web/.env.production

# 或者查看文件是否存在
ls -la apps/web/.env.production
```

---

## 下一步：运行部署脚本

配置好环境变量后，运行部署脚本：

```bash
# 进入项目目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 给脚本执行权限
chmod +x infrastructure/scripts/deploy.sh

# 运行部署脚本
./infrastructure/scripts/deploy.sh
```

**这个脚本会**：
- 安装 pnpm
- 安装项目依赖
- 构建项目
- 运行数据库迁移
- 启动 PM2 服务

**预计时间**：5-15 分钟

---

## 如果部署脚本执行失败

### 检查环境变量

```bash
cat apps/web/.env.production
```

确保 `NEXT_PUBLIC_APP_URL` 已配置。

### 检查数据库和 Redis

如果数据库或 Redis 还没配置，部署脚本可能会失败。可以先只配置 `NEXT_PUBLIC_APP_URL`，其他配置后续再添加。

---

## 完成检查清单

- [x] 项目文件已复制到网站目录
- [ ] 环境变量文件已创建（`.env.production`）
- [ ] `NEXT_PUBLIC_APP_URL` 已配置为 `https://www.linkloredu.com`
- [ ] 部署脚本已运行
- [ ] PM2 服务已启动











