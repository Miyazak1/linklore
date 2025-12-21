# 编辑环境变量文件的几种方法

## 问题
执行 `nano apps/web/.env.production` 时提示：
```
-bash: nano: command not found
```

## 解决方案

### 方案 1：使用宝塔面板文件管理器（最简单，推荐）

1. 登录宝塔面板
2. 进入 **文件** 菜单
3. 导航到项目目录：`/root/linklore` 或 `/www/wwwroot/linklore`
4. 进入 `apps/web/` 目录
5. 找到 `.env.production` 文件（如果没有，点击 **新建文件**）
6. 点击文件名，在右侧编辑器中编辑
7. 添加或修改配置：
   ```bash
   NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"
   ```
8. 点击 **保存**

---

### 方案 2：安装 nano 编辑器

在终端执行：

```bash
# Alibaba Cloud Linux 3 / CentOS
sudo dnf install -y nano

# Ubuntu/Debian
# sudo apt-get update && sudo apt-get install -y nano
```

然后使用：
```bash
nano apps/web/.env.production
```

---

### 方案 3：使用 vi/vim 编辑器（系统自带）

```bash
vi apps/web/.env.production
```

**vi 编辑器使用方法**：
1. 按 `i` 进入编辑模式
2. 编辑内容
3. 按 `Esc` 退出编辑模式
4. 输入 `:wq` 保存并退出
5. 或输入 `:q!` 不保存退出

---

### 方案 4：使用 echo 命令创建/追加内容

```bash
# 进入项目目录
cd /root/linklore

# 创建环境变量文件（如果不存在）
touch apps/web/.env.production

# 添加配置（追加内容）
echo 'NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"' >> apps/web/.env.production

# 查看文件内容
cat apps/web/.env.production
```

**注意**：如果文件已存在内容，使用 `>>` 会追加，使用 `>` 会覆盖。

---

### 方案 5：使用 cat 命令创建文件

```bash
cd /root/linklore

cat > apps/web/.env.production << 'EOF'
NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"
DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/linklore?sslmode=require"
SESSION_SECRET="你的32位以上随机字符串"
REDIS_URL="redis://:密码@Redis地址:6379/0"
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="你的AccessKey ID"
OSS_ACCESS_KEY_SECRET="你的AccessKey Secret"
OSS_BUCKET="你的Bucket名称"
EOF
```

然后编辑文件添加其他配置。

---

## 推荐方案

**对于宝塔面板用户，推荐使用方案 1（宝塔面板文件管理器）**，因为：
- 不需要安装额外软件
- 图形界面，操作简单
- 可以直接编辑文件
- 支持语法高亮

---

## 验证文件内容

编辑完成后，验证文件内容：

```bash
cat apps/web/.env.production
```

应该能看到你添加的配置。

---

## 完整的环境变量配置示例

如果你需要完整的配置，可以参考以下内容：

```bash
# 应用 URL（必须配置！）
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

# AI 配置（可选）
AI_DEFAULT_PROVIDER="qwen"
AI_ALLOWED_PROVIDERS="openai,qwen"
AI_FALLBACK_PROVIDER="qwen"

# 队列配置（可选）
QUEUE_CONCURRENCY=3

# 文件上传配置（可选）
MAX_FILE_SIZE_MB=20
ALLOWED_EXT="doc,docx,txt,md,pdf,epub"
```

---

## 下一步

配置好环境变量后，继续执行：

```bash
# 运行部署脚本
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh
```











