#!/bin/bash
# 磁盘空间清理脚本 - 紧急清理

set -e

echo "=========================================="
echo "磁盘空间紧急清理脚本"
echo "=========================================="

# 1. 检查当前磁盘使用情况
echo ""
echo "1. 当前磁盘使用情况："
df -h | grep -E "Filesystem|/dev/vda"

# 2. 停止所有容器（释放运行中的资源）
echo ""
echo "2. 停止所有 Docker 容器..."
cd /www/wwwroot/linklore 2>/dev/null || cd ~
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true

# 3. 清理 Docker 未使用的资源（镜像、容器、网络、构建缓存）
echo ""
echo "3. 清理 Docker 未使用的资源..."
echo "   - 清理未使用的镜像、容器、网络和构建缓存..."
docker system prune -af --volumes 2>/dev/null || true

# 4. 清理 Docker 日志
echo ""
echo "4. 清理 Docker 容器日志..."
find /var/lib/docker/containers/ -name "*.log" -type f -exec truncate -s 0 {} \; 2>/dev/null || true

# 5. 清理系统日志
echo ""
echo "5. 清理系统日志..."
journalctl --vacuum-time=3d 2>/dev/null || true
find /var/log -name "*.log" -type f -mtime +7 -exec truncate -s 0 {} \; 2>/dev/null || true
find /var/log -name "*.gz" -type f -mtime +7 -delete 2>/dev/null || true

# 6. 清理临时文件
echo ""
echo "6. 清理临时文件..."
rm -rf /tmp/* 2>/dev/null || true
rm -rf /var/tmp/* 2>/dev/null || true

# 7. 清理包管理器缓存
echo ""
echo "7. 清理包管理器缓存..."
if command -v dnf &> /dev/null; then
    dnf clean all 2>/dev/null || true
elif command -v yum &> /dev/null; then
    yum clean all 2>/dev/null || true
elif command -v apt-get &> /dev/null; then
    apt-get clean 2>/dev/null || true
fi

# 8. 清理宝塔面板日志
echo ""
echo "8. 清理宝塔面板日志..."
find /www/server/panel/logs -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
find /www/wwwlogs -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
find /www/wwwlogs -name "*.gz" -type f -mtime +7 -delete 2>/dev/null || true

# 9. 查找大文件（前10个）
echo ""
echo "9. 查找占用空间最大的文件/目录（前10个）："
du -h / 2>/dev/null | sort -rh | head -10 || du -h /www 2>/dev/null | sort -rh | head -10

# 10. 再次检查磁盘使用情况
echo ""
echo "10. 清理后的磁盘使用情况："
df -h | grep -E "Filesystem|/dev/vda"

echo ""
echo "=========================================="
echo "清理完成！"
echo "=========================================="
echo ""
echo "如果磁盘仍然很满，请检查："
echo "  1. 大文件：du -h / | sort -rh | head -20"
echo "  2. Docker 数据卷：docker volume ls"
echo "  3. 网站文件：du -h /www/wwwroot | sort -rh | head -10"

