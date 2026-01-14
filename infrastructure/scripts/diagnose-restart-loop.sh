#!/bin/bash
# 诊断容器重启循环问题

set -e

echo "=========================================="
echo "容器重启循环诊断脚本"
echo "=========================================="

cd /www/wwwroot/linklore

# 1. 查看所有容器状态
echo ""
echo "1. 容器状态："
docker compose ps

# 2. 查看 PostgreSQL 日志（最后50行）
echo ""
echo "2. PostgreSQL 日志（最后50行）："
docker compose logs --tail=50 postgres 2>&1 || docker logs mooyu-postgres --tail=50 2>&1

# 3. 查看 Web 日志（最后50行）
echo ""
echo "3. Web 日志（最后50行）："
docker compose logs --tail=50 web 2>&1 || docker logs mooyu-web --tail=50 2>&1

# 4. 检查容器退出代码
echo ""
echo "4. 容器退出代码："
docker ps -a | grep mooyu

# 5. 检查数据卷
echo ""
echo "5. 数据卷状态："
docker volume ls | grep postgres

# 6. 检查磁盘空间
echo ""
echo "6. 磁盘空间："
df -h | grep -E "Filesystem|/www"

# 7. 检查 PostgreSQL 容器详细信息
echo ""
echo "7. PostgreSQL 容器详细信息："
docker inspect mooyu-postgres 2>&1 | grep -A 20 '"State"' | head -30

# 8. 检查环境变量
echo ""
echo "8. 检查 .env 文件中的 PostgreSQL 配置："
if [ -f ".env" ]; then
    grep -E "POSTGRES_" .env | sed 's/PASSWORD=.*/PASSWORD=***/' || echo "未找到 POSTGRES_ 配置"
else
    echo ".env 文件不存在"
fi

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="

