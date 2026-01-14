# 磁盘空间清理指南

## 紧急情况：磁盘使用率 100%

当磁盘使用率达到 100% 时，会导致：
- Docker 容器无法启动或不断重启
- 无法写入日志文件
- 系统性能严重下降
- 服务无法正常运行

## 快速清理步骤

### 方法1：使用自动清理脚本

```bash
cd /www/wwwroot/linklore
chmod +x infrastructure/scripts/cleanup-disk-space.sh
./infrastructure/scripts/cleanup-disk-space.sh
```

### 方法2：手动清理（逐步执行）

#### 步骤1：停止所有容器

```bash
cd /www/wwwroot/linklore
docker compose down
```

#### 步骤2：清理 Docker 资源

```bash
# 清理未使用的镜像、容器、网络、构建缓存
docker system prune -af --volumes

# 清理 Docker 日志
find /var/lib/docker/containers/ -name "*.log" -type f -exec truncate -s 0 {} \;
```

#### 步骤3：清理系统日志

```bash
# 清理 journald 日志（保留最近3天）
journalctl --vacuum-time=3d

# 清理系统日志文件
find /var/log -name "*.log" -type f -mtime +7 -exec truncate -s 0 {} \;
find /var/log -name "*.gz" -type f -mtime +7 -delete
```

#### 步骤4：清理临时文件

```bash
rm -rf /tmp/*
rm -rf /var/tmp/*
```

#### 步骤5：清理宝塔面板日志

```bash
# 清理宝塔面板日志（保留最近7天）
find /www/server/panel/logs -name "*.log" -type f -mtime +7 -delete
find /www/wwwlogs -name "*.log" -type f -mtime +7 -delete
find /www/wwwlogs -name "*.gz" -type f -mtime +7 -delete
```

#### 步骤6：清理包管理器缓存

```bash
# Alibaba Cloud Linux / CentOS
dnf clean all
# 或
yum clean all

# Ubuntu / Debian
apt-get clean
```

## 查找大文件

### 查找占用空间最大的目录

```bash
# 查找根目录下最大的目录（前20个）
du -h / 2>/dev/null | sort -rh | head -20

# 查找 /www 目录下最大的目录
du -h /www 2>/dev/null | sort -rh | head -20

# 查找 /var 目录下最大的目录
du -h /var 2>/dev/null | sort -rh | head -20
```

### 查找大文件

```bash
# 查找大于 100MB 的文件
find / -type f -size +100M 2>/dev/null | head -20

# 查找大于 1GB 的文件
find / -type f -size +1G 2>/dev/null
```

## 清理 Docker 数据卷（谨慎操作）

如果 Docker 数据卷占用大量空间，可以清理未使用的数据卷：

```bash
# 查看所有数据卷
docker volume ls

# 查看数据卷大小
docker system df -v

# 删除未使用的数据卷（注意：会删除数据！）
docker volume prune -f
```

## 清理后的操作

清理完成后：

```bash
# 1. 检查磁盘使用情况
df -h

# 2. 重新启动容器
cd /www/wwwroot/linklore
docker compose up -d

# 3. 查看容器状态
docker compose ps

# 4. 查看日志
docker compose logs -f
```

## 预防措施

### 1. 设置日志轮转

在 `/etc/docker/daemon.json` 中配置日志大小限制：

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

然后重启 Docker：
```bash
systemctl restart docker
```

### 2. 定期清理脚本

可以设置定时任务定期清理：

```bash
# 编辑 crontab
crontab -e

# 添加每周清理任务（每周日凌晨2点）
0 2 * * 0 /www/wwwroot/linklore/infrastructure/scripts/cleanup-disk-space.sh >> /var/log/cleanup.log 2>&1
```

### 3. 监控磁盘使用率

在宝塔面板中设置磁盘使用率告警，当使用率超过 80% 时发送通知。

## 常见问题

### Q: 清理后容器仍然无法启动？

A: 检查是否还有足够的空间：
```bash
df -h
docker system df
```

### Q: 如何保留重要数据？

A: 在清理前备份重要数据：
```bash
# 备份 Docker 数据卷
docker run --rm -v linklore_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

### Q: 清理后需要重新构建镜像吗？

A: 如果清理了 Docker 构建缓存，可能需要重新构建：
```bash
cd /www/wwwroot/linklore
docker compose build --no-cache
docker compose up -d
```

