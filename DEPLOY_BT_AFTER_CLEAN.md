# 服务器清理后的部署流程

## 当前状态

✅ 服务器已清理（只保留系统和宝塔面板）  
✅ 准备重新部署项目  

---

## 下一步操作流程

### 步骤1：检查服务器环境

在宝塔面板终端执行：

```bash
# 检查系统信息
uname -a
cat /etc/os-release

# 检查宝塔面板
systemctl status bt

# 检查磁盘空间
df -h

# 检查内存
free -h
```

### 步骤2：安装 Docker（如未安装）

```bash
# 检查 Docker 是否已安装
docker --version
docker-compose --version
```

**如果未安装**：

```bash
# 方法1：通过宝塔面板安装
# 软件商店 → 搜索 "Docker 管理器" → 安装

# 方法2：命令行安装
curl -fsSL https://get.docker.com | bash
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 步骤3：克隆项目

```bash
# 进入网站根目录
cd /www/wwwroot

# 克隆项目
git clone https://github.com/Miyazak1/linklore.git linklore

# 进入项目目录
cd linklore

# 查看文件
ls -la
```

### 步骤4：配置环境变量

**在宝塔文件管理器中**：

1. 进入 `/www/wwwroot/linklore/` 目录
2. 点击 **新建** → **文件** → 文件名：`.env`
3. 编辑文件，填入配置（参考下面的模板）

**环境变量模板**：

```bash
# PostgreSQL 数据库配置
POSTGRES_DB=linklore
POSTGRES_USER=linklore_user
POSTGRES_PASSWORD=你的数据库密码（至少16位）

# Redis 配置（可选）
REDIS_PASSWORD=你的Redis密码（可选）

# 会话密钥（必需，至少32字符）
SESSION_SECRET=生成的32位随机字符串

# 阿里云 OSS 配置
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=你的AccessKey ID
OSS_ACCESS_KEY_SECRET=你的AccessKey Secret
OSS_BUCKET=你的Bucket名称

# AI 配置
AI_DEFAULT_PROVIDER=openai
AI_ALLOWED_PROVIDERS=openai,qwen
AI_FALLBACK_PROVIDER=qwen
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50

# 队列配置
QUEUE_CONCURRENCY=1

# 文件上传配置
MAX_FILE_SIZE_MB=20
ALLOWED_EXT=doc,docx,txt,md

# 生产环境配置
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**生成 SESSION_SECRET**：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 步骤5：运行部署脚本

```bash
cd /www/wwwroot/linklore

# 给脚本添加执行权限
chmod +x infrastructure/scripts/deploy-bt-docker.sh

# 运行部署脚本
./infrastructure/scripts/deploy-bt-docker.sh
```

**脚本会自动**：
- ✅ 检查 Docker 和 Docker Compose
- ✅ 验证环境变量
- ✅ 构建 Docker 镜像
- ✅ 启动所有容器（Web、PostgreSQL、Redis）
- ✅ 等待服务就绪

**预计时间**：10-20 分钟

### 步骤6：配置 Nginx 反向代理

**在宝塔面板中**：

1. 进入 **网站** → **添加站点**
   - **域名**：`your-domain.com` 和 `www.your-domain.com`
   - **根目录**：`/www/wwwroot/linklore`
   - **PHP 版本**：**纯静态**

2. 点击域名右侧的 **设置** → **反向代理** → **添加反向代理**
   - **代理名称**：`linklore`
   - **目标 URL**：`http://127.0.0.1:3000`
   - **发送域名**：`$host`

3. 进入 **配置文件**，确保包含：

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

4. 点击 **保存** → **重载配置**

### 步骤7：配置 SSL 证书

**在宝塔面板中**：

1. 网站设置 → **SSL** → **Let's Encrypt**
2. 勾选域名，点击 **申请**
3. 申请成功后，开启 **强制 HTTPS**

### 步骤8：验证部署

```bash
# 检查容器状态
cd /www/wwwroot/linklore
docker-compose ps

# 应该看到 3 个容器都在运行：
# - linklore-web
# - linklore-postgres
# - linklore-redis
```

**访问测试**：
- 访问：`https://your-domain.com`
- 健康检查：`https://your-domain.com/api/health`

---

## 快速部署命令（一键执行）

```bash
# 1. 安装 Docker
curl -fsSL https://get.docker.com | bash
systemctl start docker
systemctl enable docker
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 2. 克隆项目
cd /www/wwwroot
git clone https://github.com/Miyazak1/linklore.git linklore
cd linklore

# 3. 创建 .env 文件（需要手动编辑填入实际值）
# 在宝塔文件管理器中创建并编辑 .env 文件

# 4. 运行部署
chmod +x infrastructure/scripts/deploy-bt-docker.sh
./infrastructure/scripts/deploy-bt-docker.sh

# 5. 配置 Nginx 反向代理（在宝塔面板中操作）
# 6. 配置 SSL 证书（在宝塔面板中操作）
```

---

## 检查清单

- [ ] Docker 和 Docker Compose 已安装
- [ ] 项目已克隆到服务器
- [ ] `.env` 文件已创建并配置
- [ ] 部署脚本已成功执行
- [ ] 3 个 Docker 容器都在运行
- [ ] 网站已添加并配置反向代理
- [ ] SSL 证书已配置
- [ ] 网站可以通过 HTTPS 访问
- [ ] 健康检查通过

---

## 如果遇到问题

### 问题1：Docker 安装失败

```bash
# 检查网络连接
ping get.docker.com

# 使用国内镜像（如果网络有问题）
# 参考：https://mirrors.aliyun.com/docker-ce/
```

### 问题2：项目克隆失败

```bash
# 检查 Git 是否安装
git --version

# 检查网络连接
ping github.com

# 如果网络有问题，可以手动上传项目文件
```

### 问题3：部署脚本执行失败

```bash
# 查看详细错误
./infrastructure/scripts/deploy-bt-docker.sh

# 检查环境变量
cat .env

# 检查 Docker 服务
systemctl status docker
```

---

**完成以上步骤后，你的应用就可以正常访问了！** 🎉

