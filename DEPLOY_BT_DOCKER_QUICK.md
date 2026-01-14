# LinkLore 宝塔面板 Docker 快速部署指南

**适用于**：阿里云服务器（Alibaba Cloud Linux 3.2104 LTS 64位）+ 宝塔面板

---

## 快速开始（5步部署）

### 1. 安装宝塔面板和 Docker

```bash
# 安装宝塔面板
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh

# 安装 Docker（如果宝塔面板未安装）
curl -fsSL https://get.docker.com | bash
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 2. 上传项目

```bash
cd /www/wwwroot
git clone <your-repo-url> linklore
cd linklore
```

### 3. 配置环境变量

在宝塔文件管理器中创建 `/www/wwwroot/linklore/.env` 文件：

```bash
POSTGRES_DB=linklore
POSTGRES_USER=linklore_user
POSTGRES_PASSWORD=你的数据库密码（至少16位）

SESSION_SECRET=生成的32位随机字符串
# 生成方式：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=你的AccessKey ID
OSS_ACCESS_KEY_SECRET=你的AccessKey Secret
OSS_BUCKET=你的Bucket名称

NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 4. 运行部署脚本

```bash
cd /www/wwwroot/linklore
chmod +x infrastructure/scripts/deploy-bt-docker.sh
./infrastructure/scripts/deploy-bt-docker.sh
```

### 5. 配置 Nginx 反向代理

1. 宝塔面板 → **网站** → **添加站点**（域名：`your-domain.com`）
2. 网站设置 → **反向代理** → **添加反向代理**
   - 目标 URL：`http://127.0.0.1:3000`
3. 网站设置 → **SSL** → **Let's Encrypt** → 申请证书

---

## 常用命令

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

# 更新代码
git pull && docker-compose build web && docker-compose up -d --force-recreate web
```

---

## 详细文档

完整部署指南请查看：**[DEPLOY_BT_DOCKER_ALIYUN.md](./DEPLOY_BT_DOCKER_ALIYUN.md)**

---

## 故障排查

### 容器无法启动

```bash
# 查看日志
docker-compose logs web

# 检查环境变量
cat .env
```

### 502 Bad Gateway

```bash
# 检查容器状态
docker-compose ps

# 测试本地访问
curl http://127.0.0.1:3000/api/health
```

### 数据库连接失败

```bash
# 检查数据库容器
docker-compose logs postgres

# 测试数据库连接
docker-compose exec postgres psql -U linklore_user -d linklore
```

---

**遇到问题？** 查看详细文档或检查容器日志：`docker-compose logs -f`

