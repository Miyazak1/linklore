# 宝塔面板 Docker 部署故障排查

## 问题1：PostgreSQL 容器不健康

### 症状
```
X Container mooyu-postgres Error
dependency failed to start: container mooyu-postgres is unhealthy
```

### 排查步骤

```bash
cd /www/wwwroot/linklore

# 1. 查看 PostgreSQL 容器日志
docker-compose logs postgres

# 2. 查看容器状态
docker-compose ps

# 3. 检查容器详细信息
docker inspect mooyu-postgres | grep -A 10 "Health"

# 4. 尝试手动启动 PostgreSQL
docker-compose up -d postgres

# 5. 等待健康检查
sleep 10
docker-compose ps postgres
```

### 常见原因和解决方案

#### 原因1：数据目录权限问题

```bash
# 检查数据卷权限
docker volume inspect linklore_postgres-data

# 如果需要，删除并重新创建数据卷
docker-compose down -v
docker-compose up -d postgres
```

#### 原因2：端口冲突

```bash
# 检查端口占用
netstat -tlnp | grep 5432

# 如果被占用，修改 docker-compose.yml 中的端口映射
```

#### 原因3：环境变量配置错误

```bash
# 检查 .env 文件
cat .env | grep POSTGRES

# 确保 POSTGRES_PASSWORD 已设置且至少16位
```

#### 原因4：磁盘空间不足

```bash
# 检查磁盘空间
df -h

# 清理 Docker 资源
docker system prune -a
```

### 快速修复

```bash
cd /www/wwwroot/linklore

# 1. 停止所有容器
docker-compose down

# 2. 删除数据卷（注意：会删除数据！）
docker-compose down -v

# 3. 重新启动
docker-compose up -d

# 4. 查看日志
docker-compose logs -f postgres
```

---

## 问题2：Web 容器找不到 next 模块

### 症状
```
Error: Cannot find module 'next'
或
Error: Cannot find module '/app/node_modules/.bin/next'
```

### 解决方案

已修复，使用以下命令重新构建：

```bash
cd /www/wwwroot/linklore
git pull origin master
docker-compose down
docker rmi linklore-web
docker-compose build --no-cache web
docker-compose up -d
```

---

## 问题3：容器不断重启

### 排查步骤

```bash
# 查看容器退出代码
docker ps -a | grep mooyu-web

# 查看详细日志
docker-compose logs --tail=100 web

# 进入容器检查
docker-compose exec web sh
```

---

## 问题4：网络连接问题

### 检查容器网络

```bash
# 检查网络
docker network ls
docker network inspect linklore_mooyu-network

# 测试容器间连接
docker-compose exec web ping postgres
docker-compose exec web ping redis
```

---

## 问题5：docker-compose 找不到配置文件

### 症状
```
no configuration file provided: not found
```

### 原因
1. 不在正确的目录
2. 使用了错误的命令（新版本 Docker 使用 `docker compose` 而不是 `docker-compose`）

### 解决方案

#### 方法1：确认当前目录
```bash
# 查看当前目录
pwd

# 切换到项目目录
cd /www/wwwroot/linklore

# 确认文件存在
ls -la docker-compose.yml

# 如果文件不存在，查找文件位置
find /www/wwwroot -name "docker-compose.yml" 2>/dev/null
```

#### 方法2：使用正确的命令
```bash
cd /www/wwwroot/linklore

# 尝试新版本命令（docker compose，注意没有横线）
docker compose ps

# 如果新版本命令不行，使用旧版本
docker-compose ps

# 检查哪个命令可用
which docker-compose
docker compose version
```

#### 方法3：使用诊断脚本
```bash
cd /www/wwwroot/linklore
chmod +x infrastructure/scripts/fix-docker-compose.sh
./infrastructure/scripts/fix-docker-compose.sh
```

#### 方法4：手动指定配置文件路径
```bash
# 如果文件在其他位置
docker-compose -f /www/wwwroot/linklore/docker-compose.yml ps
# 或
docker compose -f /www/wwwroot/linklore/docker-compose.yml ps
```

### 快速修复
```bash
# 1. 进入项目目录
cd /www/wwwroot/linklore

# 2. 确认文件存在
ls docker-compose.yml

# 3. 使用正确的命令（先试新版本）
docker compose ps || docker-compose ps

# 4. 如果都不行，检查 Docker 安装
docker --version
docker-compose --version || docker compose version
```

---

## 常用诊断命令

```bash
cd /www/wwwroot/linklore

# 查看所有容器状态
docker compose ps || docker-compose ps

# 查看所有日志
docker compose logs || docker-compose logs

# 查看特定服务日志
docker compose logs web || docker-compose logs web
docker compose logs postgres || docker-compose logs postgres
docker compose logs redis || docker-compose logs redis

# 重启服务
docker compose restart web || docker-compose restart web

# 查看资源使用
docker stats

# 清理未使用的资源
docker system prune -a
```

