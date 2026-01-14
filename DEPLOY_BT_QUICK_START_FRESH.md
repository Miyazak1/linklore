# 宝塔面板快速部署（全新安装）

## 一键部署命令

```bash
# 1. 安装 Docker（如果未安装）
curl -fsSL https://get.docker.com | bash
systemctl start docker
systemctl enable docker

# 2. 安装 Git（如果未安装）
dnf install -y git

# 3. 克隆项目
cd /www/wwwroot
git clone https://github.com/Miyazak1/linklore.git
cd linklore

# 4. 创建并配置 .env 文件
cp env.template .env
nano .env  # 编辑配置文件，至少设置数据库密码和会话密钥

# 5. 生成会话密钥并添加到 .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env

# 6. 启动服务
docker compose up -d

# 7. 等待服务启动（30秒）
sleep 30

# 8. 初始化数据库
docker compose exec web npx prisma migrate deploy

# 9. 检查状态
docker compose ps
docker compose logs --tail=50
```

## 必须配置的 .env 项

编辑 `.env` 文件，至少配置以下项：

```env
# 数据库密码（至少16位）
POSTGRES_PASSWORD=你的强密码

# 会话密钥（已通过命令生成）
SESSION_SECRET=已生成

# 应用 URL
NEXT_PUBLIC_APP_URL=https://mooyu.fun

# AI 配置
AI_DEFAULT_PROVIDER=siliconflow
SILICONFLOW_API_KEY=你的API密钥
```

## 在宝塔面板中配置反向代理

1. **网站** → 找到 `mooyu.fun` → **设置**
2. **反向代理** → **添加反向代理**
3. 目标URL：`http://127.0.0.1:3000`
4. 提交

## 验证部署

```bash
# 检查容器状态
docker compose ps

# 访问网站
curl http://localhost:3000/api/health
```

## 如果遇到问题

查看详细文档：[DEPLOY_BT_FRESH_INSTALL.md](./DEPLOY_BT_FRESH_INSTALL.md)

