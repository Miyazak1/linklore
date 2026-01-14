# 宝塔面板 Docker 部署 - 下一步操作指南

## 📋 部署前检查清单

在开始部署前，请确保：

- [ ] 阿里云服务器已购买并运行
- [ ] 服务器系统：Alibaba Cloud Linux 3.2104 LTS 64位
- [ ] 宝塔面板已安装（如未安装，见步骤1）
- [ ] 域名已解析到服务器 IP（如未解析，见步骤2）
- [ ] 阿里云 OSS 已创建并获取 AccessKey（如未创建，见步骤3）
- [ ] 已准备好数据库密码和会话密钥

---

## 🚀 部署步骤（按顺序执行）

### 步骤1：安装宝塔面板和 Docker（如未安装）

**在服务器终端执行**（通过 SSH 或阿里云控制台）：

```bash
# 安装宝塔面板
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh

# 安装完成后，记录面板地址和账号密码
# 面板地址：http://your-server-ip:8888
```

**登录宝塔面板后，安装 Docker**：

1. 进入 **软件商店** → 搜索 **Docker 管理器** → 点击 **安装**
2. 或者使用命令行安装：

```bash
# 安装 Docker
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

---

### 步骤2：配置域名解析（如未配置）

1. 登录阿里云控制台
2. 进入 **云解析 DNS** 或 **域名管理**
3. 添加解析记录：
   - **记录类型**：A
   - **主机记录**：`@` 和 `www`
   - **记录值**：你的服务器 IP 地址
   - **TTL**：10分钟（默认）

等待解析生效（通常几分钟内）

---

### 步骤3：创建阿里云 OSS（如未创建）

1. 登录阿里云控制台
2. 进入 **对象存储 OSS** → **Bucket 列表** → **创建 Bucket**
3. 配置：
   - **Bucket 名称**：自定义（如 `linklore-files`）
   - **地域**：选择离服务器最近的（如 `华东1（杭州）`）
   - **读写权限**：**私有**（推荐）或 **公共读**
   - 其他保持默认
4. 创建后，进入 **AccessKey 管理**：
   - 创建 AccessKey（如果还没有）
   - 记录 **AccessKey ID** 和 **AccessKey Secret**

---

### 步骤4：在服务器上克隆项目

**在宝塔面板终端执行**：

```bash
# 进入网站根目录
cd /www/wwwroot

# 克隆项目（替换为你的仓库地址）
git clone https://github.com/Miyazak1/linklore.git linklore

# 进入项目目录
cd linklore

# 查看文件是否完整
ls -la
```

---

### 步骤5：配置环境变量

**在宝塔面板文件管理器中**：

1. 进入 `/www/wwwroot/linklore/` 目录
2. 点击 **新建** → **文件** → 文件名：`.env`
3. 点击 **创建**，然后编辑文件，填入以下内容：

```bash
# PostgreSQL 数据库配置
POSTGRES_DB=linklore
POSTGRES_USER=linklore_user
POSTGRES_PASSWORD=你的数据库密码（至少16位，建议使用强密码）

# Redis 配置（可选，建议设置密码）
REDIS_PASSWORD=你的Redis密码（可选）

# 会话密钥（必需，至少32字符）
# 生成方式：在终端执行 node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=生成的32位随机字符串

# 阿里云 OSS 配置
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=你的AccessKey ID
OSS_ACCESS_KEY_SECRET=你的AccessKey Secret
OSS_BUCKET=你的Bucket名称

# AI 配置（可选）
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
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**重要**：替换所有占位符为实际值！

**生成 SESSION_SECRET**（在宝塔终端执行）：

```bash
# 如果服务器有 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 如果没有 Node.js，可以使用在线工具或本地生成后复制
```

---

### 步骤6：运行部署脚本

**在宝塔面板终端执行**：

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

---

### 步骤7：配置 Nginx 反向代理

**在宝塔面板中**：

1. 进入 **网站** → **添加站点**
2. 配置：
   - **域名**：`your-domain.com` 和 `www.your-domain.com`（两个都添加）
   - **根目录**：`/www/wwwroot/linklore`（或任意目录）
   - **PHP 版本**：**纯静态**
3. 点击 **提交**

4. 在网站列表中，点击域名右侧的 **设置**
5. 进入 **反向代理** → **添加反向代理**
   - **代理名称**：`linklore`
   - **目标 URL**：`http://127.0.0.1:3000`
   - **发送域名**：`$host`
6. 点击 **保存**

---

### 步骤8：配置 SSL 证书（HTTPS）

**在宝塔面板中**：

1. 在网站设置中，进入 **SSL** 标签
2. 选择 **Let's Encrypt**
3. 勾选你的域名（`your-domain.com` 和 `www.your-domain.com`）
4. 点击 **申请**
5. 等待申请完成（约1-2分钟）
6. 申请成功后，开启 **强制 HTTPS**

---

### 步骤9：配置防火墙

**在宝塔面板中**：

1. 进入 **安全** 菜单
2. 确保以下端口已开放：
   - `80` (HTTP)
   - `443` (HTTPS)
   - `22` (SSH)
   - `8888` (宝塔面板，建议修改默认端口)

**在阿里云控制台**：

1. 进入 **ECS** → **网络与安全** → **安全组**
2. 找到你的服务器对应的安全组
3. 添加入方向规则：
   - **端口**：`80/80`，**协议**：TCP，**授权对象**：`0.0.0.0/0`
   - **端口**：`443/443`，**协议**：TCP，**授权对象**：`0.0.0.0/0`
   - **端口**：`22/22`，**协议**：TCP，**授权对象**：`你的IP/32`（建议限制SSH访问）

---

### 步骤10：验证部署

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
2. 应该看到应用首页
3. 访问健康检查：`https://your-domain.com/api/health`
   - 应该返回 JSON 响应，包含 `"ok": true`

**测试功能**：
- ✅ 匿名用户访问
- ✅ 注册功能（需要邀请码）
- ✅ 登录功能
- ✅ 聊天功能

---

## 🔧 如果遇到问题

### 问题1：部署脚本执行失败

```bash
# 查看详细错误信息
cd /www/wwwroot/linklore
./infrastructure/scripts/deploy-bt-docker.sh

# 手动检查
docker --version
docker-compose --version
cat .env  # 检查环境变量文件
```

### 问题2：容器无法启动

```bash
# 查看容器日志
cd /www/wwwroot/linklore
docker-compose logs web
docker-compose logs postgres
docker-compose logs redis

# 检查端口占用
netstat -tlnp | grep 3000
```

### 问题3：网站 502 Bad Gateway

```bash
# 检查容器是否运行
docker-compose ps

# 测试本地访问
curl http://127.0.0.1:3000/api/health

# 检查 Nginx 配置
# 在宝塔面板：网站 → 设置 → 配置文件
```

### 问题4：数据库连接失败

```bash
# 检查数据库容器
docker-compose logs postgres

# 测试数据库连接
docker-compose exec postgres psql -U linklore_user -d linklore
```

**更多问题排查**：查看 `DEPLOY_BT_DOCKER_ALIYUN.md` 的"常见问题排查"章节

---

## 📚 相关文档

- **完整部署指南**：`DEPLOY_BT_DOCKER_ALIYUN.md`
- **快速部署指南**：`DEPLOY_BT_DOCKER_QUICK.md`
- **拉取更新指南**：`DEPLOY_BT_PULL_UPDATE.md`

---

## ✅ 部署完成检查清单

- [ ] 宝塔面板已安装并可以访问
- [ ] Docker 和 Docker Compose 已安装
- [ ] 项目已克隆到服务器
- [ ] `.env` 文件已配置（所有占位符已替换）
- [ ] 部署脚本已成功执行
- [ ] 3 个 Docker 容器都在运行
- [ ] 网站已添加并配置反向代理
- [ ] SSL 证书已申请并配置
- [ ] 防火墙和安全组已配置
- [ ] 网站可以通过 HTTPS 访问
- [ ] 健康检查通过（`/api/health`）
- [ ] 基本功能测试通过

---

## 🎉 部署成功后

部署成功后，你可以：

1. **访问网站**：`https://your-domain.com`
2. **查看日志**：`docker-compose logs -f web`
3. **重启服务**：`docker-compose restart`
4. **更新代码**：参考 `DEPLOY_BT_PULL_UPDATE.md`

**恭喜！部署完成！** 🎊

