# 宝塔面板 Docker 部署 - 继续下一步

## 当前状态

✅ 宝塔面板已安装  
✅ SSL 证书已配置  
✅ PostgreSQL 数据库已准备好（linklore_user）  
✅ 项目代码已拉取到服务器  

---

## 下一步操作

### 步骤1：检查 Docker 是否已安装

在宝塔面板终端执行：

```bash
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

# 验证
docker --version
docker-compose --version
```

---

### 步骤2：配置环境变量文件

**在宝塔文件管理器中**：

1. 进入 `/www/wwwroot/linklore/` 目录
2. 点击 **新建** → **文件** → 文件名：`.env`
3. 编辑文件，填入以下内容：

```bash
# PostgreSQL 数据库配置
POSTGRES_DB=linklore
POSTGRES_USER=linklore_user
POSTGRES_PASSWORD=你的数据库密码（从宝塔面板数据库管理中获取）

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

**生成 SESSION_SECRET**（在终端执行）：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**重要**：替换所有占位符为实际值！

---

### 步骤3：运行部署脚本

在宝塔面板终端执行：

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

**预计时间**：10-20 分钟（首次构建需要下载镜像）

**查看进度**：

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f web
```

---

### 步骤4：配置 Nginx 反向代理

**在宝塔面板中**：

1. 进入 **网站** → **添加站点**（如果还没有）
   - **域名**：`your-domain.com` 和 `www.your-domain.com`
   - **根目录**：`/www/wwwroot/linklore`（或任意目录）
   - **PHP 版本**：**纯静态**

2. 在网站列表中，点击域名右侧的 **设置**

3. 进入 **反向代理** → **添加反向代理**
   - **代理名称**：`linklore`
   - **目标 URL**：`http://127.0.0.1:3000`
   - **发送域名**：`$host`
   - 点击 **保存**

4. 进入 **配置文件** 标签，确保 `location /` 块包含：

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

5. 点击 **保存** → **重载配置**

6. **SSL 证书**（如果已配置，确保开启强制 HTTPS）
   - 网站设置 → **SSL** → 开启 **强制 HTTPS**

---

### 步骤5：验证部署

**检查容器状态**：

```bash
cd /www/wwwroot/linklore
docker-compose ps
```

应该看到 3 个容器都在运行：
- `linklore-web`（Web 应用）
- `linklore-postgres`（PostgreSQL）
- `linklore-redis`（Redis）

**访问网站**：

1. 打开浏览器访问：`https://your-domain.com`
2. 访问健康检查：`https://your-domain.com/api/health`
   - 应该返回 JSON 响应，包含 `"ok": true`

**测试功能**：
- ✅ 匿名用户访问
- ✅ 注册功能
- ✅ 登录功能
- ✅ 聊天功能

---

## 如果遇到问题

### 问题1：Docker 构建失败

```bash
# 查看详细错误
docker-compose build --no-cache web

# 检查磁盘空间
df -h

# 清理 Docker 缓存
docker system prune -a
```

### 问题2：容器无法启动

```bash
# 查看日志
docker-compose logs web
docker-compose logs postgres
docker-compose logs redis

# 检查环境变量
cat .env
```

### 问题3：502 Bad Gateway

```bash
# 检查容器是否运行
docker-compose ps

# 测试本地访问
curl http://127.0.0.1:3000/api/health

# 检查 Nginx 配置
# 在宝塔面板：网站 → 设置 → 配置文件
```

---

## 快速命令参考

```bash
cd /www/wwwroot/linklore

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f web

# 重启服务
docker-compose restart

# 停止服务
docker-compose stop

# 启动服务
docker-compose start
```

---

## 下一步检查清单

- [ ] Docker 和 Docker Compose 已安装
- [ ] `.env` 文件已创建并配置（所有占位符已替换）
- [ ] 部署脚本已成功执行
- [ ] 3 个 Docker 容器都在运行
- [ ] 网站已添加并配置反向代理
- [ ] SSL 证书已配置（强制 HTTPS）
- [ ] 网站可以通过 HTTPS 访问
- [ ] 健康检查通过（`/api/health`）

---

**完成以上步骤后，你的应用就可以正常访问了！** 🎉

