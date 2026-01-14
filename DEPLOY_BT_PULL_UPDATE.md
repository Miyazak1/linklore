# 宝塔面板拉取更新指南

## 快速拉取更新

在宝塔面板 **终端** 中执行以下命令：

```bash
# 1. 进入项目目录
cd /www/wwwroot/linklore

# 2. 查看当前状态
git status

# 3. 拉取最新代码
git pull origin master

# 4. 如果使用 Docker 部署，重新构建并重启
docker-compose down
docker-compose build web
docker-compose up -d

# 5. 查看容器状态
docker-compose ps
```

---

## 详细步骤

### 方式1：如果项目已存在（推荐）

```bash
# 进入项目目录
cd /www/wwwroot/linklore

# 查看当前分支和状态
git branch
git status

# 拉取最新代码
git pull origin master

# 如果使用 Docker 部署
cd /www/wwwroot/linklore
docker-compose pull          # 拉取最新镜像
docker-compose up -d --build # 重新构建并启动

# 如果使用 PM2 部署
cd /www/wwwroot/linklore
pnpm install --frozen-lockfile
pnpm build
pm2 restart ecosystem.config.js
```

### 方式2：如果是首次克隆项目

```bash
# 进入网站根目录
cd /www/wwwroot

# 克隆项目
git clone https://github.com/Miyazak1/linklore.git linklore

# 进入项目目录
cd linklore

# 配置环境变量（参考 DEPLOY_BT_DOCKER_ALIYUN.md）
# 然后运行部署脚本
chmod +x infrastructure/scripts/deploy-bt-docker.sh
./infrastructure/scripts/deploy-bt-docker.sh
```

---

## 更新后的操作

### Docker 部署更新

```bash
cd /www/wwwroot/linklore

# 拉取代码
git pull origin master

# 如果有新的环境变量或配置变更
# 编辑 .env 文件（如果需要）

# 重新构建并启动
docker-compose build web
docker-compose up -d --force-recreate web

# 查看日志确认启动成功
docker-compose logs -f web
```

### PM2 部署更新

```bash
cd /www/wwwroot/linklore

# 拉取代码
git pull origin master

# 安装新依赖（如果有）
pnpm install --frozen-lockfile

# 重新生成 Prisma Client（如果有数据库变更）
pnpm prisma:generate

# 运行数据库迁移（如果有新迁移）
pnpm prisma:migrate

# 重新构建
pnpm build

# 重启服务
pm2 restart ecosystem.config.js
```

---

## 常见问题

### 问题1：拉取时出现冲突

```bash
# 查看冲突文件
git status

# 备份当前更改
git stash

# 拉取最新代码
git pull origin master

# 恢复你的更改（如果需要）
git stash pop
```

### 问题2：本地有未提交的更改

```bash
# 查看更改
git status

# 提交更改（如果需要）
git add .
git commit -m "本地更改说明"

# 然后拉取
git pull origin master
```

### 问题3：需要重置到最新版本

```bash
# 警告：这会丢失本地未提交的更改
git fetch origin
git reset --hard origin/master
```

---

## 验证更新

```bash
# 检查代码版本
cd /www/wwwroot/linklore
git log --oneline -5

# 检查 Docker 容器状态
docker-compose ps

# 检查应用健康状态
curl http://127.0.0.1:3000/api/health
```

---

**提示**：建议在更新前先备份数据库和重要配置文件！

