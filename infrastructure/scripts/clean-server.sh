#!/bin/bash
# 服务器清理脚本 - 只保留系统和宝塔面板
# 警告：此脚本会删除所有网站、数据库、Docker 容器等用户数据

set -e

echo "=========================================="
echo "服务器清理脚本"
echo "=========================================="
echo ""
echo "⚠️  警告：此脚本将删除以下内容："
echo "  - 所有网站文件（/www/wwwroot/）"
echo "  - 所有数据库（除了宝塔面板系统数据库）"
echo "  - 所有 Docker 容器和镜像"
echo "  - 所有用户安装的软件（除了宝塔面板）"
echo "  - 所有日志文件"
echo ""
echo "保留的内容："
echo "  - 系统文件"
echo "  - 宝塔面板及其配置"
echo "  - 系统服务"
echo ""

read -p "确认要继续吗？(yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "操作已取消"
    exit 0
fi

echo ""
echo "开始清理..."

# 1. 停止所有 Docker 容器
echo ""
echo "[1/8] 停止所有 Docker 容器..."
if command -v docker &> /dev/null; then
    docker stop $(docker ps -aq) 2>/dev/null || echo "没有运行中的容器"
    docker rm $(docker ps -aq) 2>/dev/null || echo "没有容器需要删除"
    echo "✓ Docker 容器已清理"
else
    echo "✓ Docker 未安装，跳过"
fi

# 2. 删除所有 Docker 镜像
echo ""
echo "[2/8] 删除所有 Docker 镜像..."
if command -v docker &> /dev/null; then
    docker rmi $(docker images -q) 2>/dev/null || echo "没有镜像需要删除"
    docker system prune -a -f 2>/dev/null || true
    echo "✓ Docker 镜像已清理"
else
    echo "✓ Docker 未安装，跳过"
fi

# 3. 停止所有 PM2 进程
echo ""
echo "[3/8] 停止所有 PM2 进程..."
if command -v pm2 &> /dev/null; then
    pm2 delete all 2>/dev/null || echo "没有 PM2 进程"
    pm2 kill 2>/dev/null || true
    echo "✓ PM2 进程已清理"
else
    echo "✓ PM2 未安装，跳过"
fi

# 4. 删除所有网站文件
echo ""
echo "[4/8] 删除所有网站文件..."
if [ -d "/www/wwwroot" ]; then
    # 备份列表（可选）
    ls -la /www/wwwroot/ > /tmp/wwwroot_backup_list.txt 2>/dev/null || true
    
    # 删除所有网站文件
    rm -rf /www/wwwroot/*
    echo "✓ 网站文件已清理"
else
    echo "✓ /www/wwwroot 目录不存在，跳过"
fi

# 5. 删除所有数据库（除了宝塔面板系统数据库）
echo ""
echo "[5/8] 清理数据库..."

# MySQL/MariaDB
if command -v mysql &> /dev/null; then
    echo "清理 MySQL 数据库..."
    mysql -e "SHOW DATABASES;" | grep -v -E "^(Database|information_schema|performance_schema|mysql|sys|bt_default)" | while read db; do
        mysql -e "DROP DATABASE IF EXISTS \`$db\`;" 2>/dev/null || true
    done
    echo "✓ MySQL 数据库已清理"
fi

# PostgreSQL
if command -v psql &> /dev/null; then
    echo "清理 PostgreSQL 数据库..."
    sudo -u postgres psql -c "SELECT datname FROM pg_database WHERE datname NOT IN ('template0', 'template1', 'postgres');" 2>/dev/null | \
    grep -v "datname\|-----\|^$" | \
    while read db; do
        if [ ! -z "$db" ]; then
            sudo -u postgres psql -c "DROP DATABASE IF EXISTS \"$db\";" 2>/dev/null || true
        fi
    done
    echo "✓ PostgreSQL 数据库已清理"
fi

# 6. 清理日志文件
echo ""
echo "[6/8] 清理日志文件..."
# 清理网站日志（保留宝塔面板日志）
find /www/wwwlogs -type f -name "*.log" -delete 2>/dev/null || true
find /www/wwwlogs -type f -name "*.log.*" -delete 2>/dev/null || true
# 清理系统日志（可选，谨慎）
# journalctl --vacuum-time=1d 2>/dev/null || true
echo "✓ 日志文件已清理"

# 7. 清理临时文件
echo ""
echo "[7/8] 清理临时文件..."
rm -rf /tmp/* 2>/dev/null || true
rm -rf /var/tmp/* 2>/dev/null || true
echo "✓ 临时文件已清理"

# 8. 清理用户安装的软件（可选，谨慎操作）
echo ""
echo "[8/8] 清理用户软件..."
read -p "是否删除用户通过包管理器安装的软件？(yes/no，默认no): " CLEAN_PACKAGES

if [ "$CLEAN_PACKAGES" = "yes" ]; then
    echo "⚠️  警告：这将删除所有用户安装的软件包"
    read -p "确认继续？(yes/no): " CONFIRM_PACKAGES
    
    if [ "$CONFIRM_PACKAGES" = "yes" ]; then
        # 列出用户安装的包（排除系统包）
        if command -v yum &> /dev/null; then
            # CentOS/Alibaba Cloud Linux
            yum list installed | grep -v "@" | tail -n +2 | awk '{print $1}' > /tmp/user_packages.txt 2>/dev/null || true
        elif command -v apt &> /dev/null; then
            # Ubuntu/Debian
            apt list --installed 2>/dev/null | grep -v "Listing" | cut -d'/' -f1 > /tmp/user_packages.txt || true
        fi
        echo "用户安装的软件包列表已保存到 /tmp/user_packages.txt"
        echo "（实际删除操作已禁用，请手动检查后删除）"
    fi
else
    echo "✓ 跳过软件包清理"
fi

echo ""
echo "=========================================="
echo "清理完成！"
echo "=========================================="
echo ""
echo "已清理的内容："
echo "  ✓ Docker 容器和镜像"
echo "  ✓ PM2 进程"
echo "  ✓ 网站文件"
echo "  ✓ 用户数据库"
echo "  ✓ 日志文件"
echo "  ✓ 临时文件"
echo ""
echo "保留的内容："
echo "  ✓ 系统文件"
echo "  ✓ 宝塔面板（/www/server/panel/）"
echo "  ✓ 宝塔面板配置"
echo "  ✓ 系统服务"
echo ""
echo "建议："
echo "  1. 重启服务器以确保清理彻底"
echo "  2. 检查宝塔面板是否正常运行"
echo "  3. 检查磁盘空间：df -h"
echo ""

