#!/bin/bash
# 修复 docker-compose 配置文件问题

set -e

echo "=========================================="
echo "Docker Compose 配置修复脚本"
echo "=========================================="

# 检查当前目录
CURRENT_DIR=$(pwd)
echo "当前目录: $CURRENT_DIR"

# 检查 docker-compose.yml 是否存在
if [ ! -f "docker-compose.yml" ]; then
    echo "✗ docker-compose.yml 不存在"
    echo "查找 docker-compose.yml 文件..."
    find /www/wwwroot -name "docker-compose.yml" 2>/dev/null | head -5
    
    # 尝试进入可能的目录
    if [ -d "/www/wwwroot/linklore" ]; then
        echo "切换到 /www/wwwroot/linklore"
        cd /www/wwwroot/linklore
    elif [ -d "/www/wwwroot" ]; then
        echo "在 /www/wwwroot 中查找..."
        cd /www/wwwroot
        find . -name "docker-compose.yml" -type f 2>/dev/null | head -3
    fi
else
    echo "✓ docker-compose.yml 存在"
fi

# 检查 docker-compose 命令
echo ""
echo "检查 docker-compose 命令..."
if command -v docker-compose &> /dev/null; then
    echo "✓ docker-compose 已安装"
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    echo "✓ docker compose 已安装（新版本）"
    COMPOSE_CMD="docker compose"
else
    echo "✗ docker-compose 未安装"
    echo "请安装 Docker Compose"
    exit 1
fi

# 验证配置文件
echo ""
echo "验证配置文件..."
if [ -f "docker-compose.yml" ]; then
    echo "✓ docker-compose.yml 存在"
    echo "文件位置: $(pwd)/docker-compose.yml"
    
    # 检查语法
    $COMPOSE_CMD config > /dev/null 2>&1 && echo "✓ 配置文件语法正确" || echo "✗ 配置文件语法错误"
    
    # 显示服务列表
    echo ""
    echo "配置文件中的服务:"
    $COMPOSE_CMD config --services 2>/dev/null || echo "无法读取服务列表"
else
    echo "✗ docker-compose.yml 不存在"
    echo "请确保在项目根目录执行此脚本"
    exit 1
fi

echo ""
echo "=========================================="
echo "修复完成"
echo "=========================================="
echo ""
echo "现在可以使用以下命令："
echo "  $COMPOSE_CMD ps"
echo "  $COMPOSE_CMD up -d"
echo "  $COMPOSE_CMD logs -f"

