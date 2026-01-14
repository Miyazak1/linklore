# 服务器清理指南 - 只保留系统和宝塔面板

## 概述

此指南帮助您清理服务器，只保留系统和宝塔面板，删除所有用户数据。

## ⚠️ 警告

**执行清理前，请确保：**
- ✅ 已备份重要数据
- ✅ 已记录重要配置信息
- ✅ 已确认不需要保留任何用户数据

## 清理内容

### 将被删除的内容：
- 所有网站文件（`/www/wwwroot/`）
- 所有数据库（除了宝塔面板系统数据库）
- 所有 Docker 容器和镜像
- 所有 PM2 进程
- 所有日志文件
- 临时文件

### 将被保留的内容：
- 系统文件
- 宝塔面板（`/www/server/panel/`）
- 宝塔面板配置
- 系统服务

## 使用方法

### 方法1：使用清理脚本（推荐）

```bash
# 1. 进入项目目录（如果已克隆）
cd /www/wwwroot/linklore

# 或者直接下载脚本
cd /tmp
wget https://raw.githubusercontent.com/Miyazak1/linklore/master/infrastructure/scripts/clean-server.sh

# 2. 添加执行权限
chmod +x clean-server.sh

# 3. 运行脚本
./clean-server.sh
```

脚本会：
1. 显示警告信息
2. 要求确认
3. 逐步清理各项内容
4. 显示清理结果

### 方法2：手动清理

#### 步骤1：停止所有服务

```bash
# 停止 Docker 容器
docker stop $(docker ps -aq) 2>/dev/null
docker rm $(docker ps -aq) 2>/dev/null

# 停止 PM2 进程
pm2 delete all 2>/dev/null
pm2 kill 2>/dev/null

# 停止其他可能运行的服务
systemctl stop nginx 2>/dev/null || true
systemctl stop mysql 2>/dev/null || true
systemctl stop postgresql 2>/dev/null || true
```

#### 步骤2：删除网站文件

```bash
# 备份列表（可选）
ls -la /www/wwwroot/ > /tmp/wwwroot_backup_list.txt

# 删除所有网站文件
rm -rf /www/wwwroot/*
```

#### 步骤3：清理数据库

**MySQL/MariaDB：**
```bash
mysql -e "SHOW DATABASES;" | grep -v -E "^(Database|information_schema|performance_schema|mysql|sys|bt_default)" | while read db; do
    mysql -e "DROP DATABASE IF EXISTS \`$db\`;"
done
```

**PostgreSQL：**
```bash
sudo -u postgres psql -c "SELECT datname FROM pg_database WHERE datname NOT IN ('template0', 'template1', 'postgres');" | \
grep -v "datname\|-----\|^$" | \
while read db; do
    if [ ! -z "$db" ]; then
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS \"$db\";"
    fi
done
```

#### 步骤4：清理 Docker

```bash
# 删除所有容器
docker rm -f $(docker ps -aq) 2>/dev/null

# 删除所有镜像
docker rmi -f $(docker images -q) 2>/dev/null

# 清理系统
docker system prune -a -f
```

#### 步骤5：清理日志

```bash
# 清理网站日志
find /www/wwwlogs -type f -name "*.log" -delete
find /www/wwwlogs -type f -name "*.log.*" -delete

# 清理临时文件
rm -rf /tmp/*
rm -rf /var/tmp/*
```

## 清理后检查

### 1. 检查磁盘空间

```bash
df -h
```

### 2. 检查宝塔面板

```bash
# 检查宝塔面板服务
systemctl status bt

# 访问宝塔面板
# http://your-server-ip:8888
```

### 3. 检查系统服务

```bash
# 检查关键服务状态
systemctl status nginx
systemctl status mysql
systemctl status postgresql
systemctl status docker
```

### 4. 检查剩余文件

```bash
# 检查网站目录
ls -la /www/wwwroot/

# 检查数据库
mysql -e "SHOW DATABASES;"
sudo -u postgres psql -c "\l"

# 检查 Docker
docker ps -a
docker images
```

## 清理后建议

1. **重启服务器**（确保清理彻底）
   ```bash
   reboot
   ```

2. **更新系统**（可选）
   ```bash
   # CentOS/Alibaba Cloud Linux
   yum update -y
   
   # Ubuntu/Debian
   apt update && apt upgrade -y
   ```

3. **检查宝塔面板**
   - 登录宝塔面板
   - 检查软件商店
   - 检查数据库管理
   - 检查文件管理

4. **重新开始部署**
   - 按照部署指南重新部署项目
   - 或使用全新的配置

## 常见问题

### Q1: 清理后宝塔面板无法访问？

**解决方法：**
```bash
# 重启宝塔面板
/etc/init.d/bt restart

# 检查端口
netstat -tlnp | grep 8888

# 检查防火墙
firewall-cmd --list-ports
```

### Q2: 清理后数据库服务无法启动？

**解决方法：**
```bash
# MySQL
systemctl start mysql
systemctl status mysql

# PostgreSQL
systemctl start postgresql
systemctl status postgresql
```

### Q3: 清理后磁盘空间没有释放？

**解决方法：**
```bash
# 清理 Docker 未使用的数据
docker system prune -a -f --volumes

# 清理系统日志
journalctl --vacuum-time=1d

# 清理包管理器缓存
yum clean all  # CentOS
apt clean       # Ubuntu/Debian
```

## 安全建议

1. **备份重要数据**：清理前务必备份
2. **记录配置**：记录重要的配置信息
3. **测试环境**：建议先在测试环境验证
4. **逐步清理**：可以分步骤执行，避免一次性删除过多

## 快速命令参考

```bash
# 一键清理（使用脚本）
cd /www/wwwroot/linklore
chmod +x infrastructure/scripts/clean-server.sh
./infrastructure/scripts/clean-server.sh

# 手动清理 Docker
docker system prune -a -f --volumes

# 手动清理网站
rm -rf /www/wwwroot/*

# 手动清理日志
find /www/wwwlogs -type f -delete
```

---

**注意**：清理操作不可逆，请谨慎操作！

