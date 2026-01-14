#!/bin/bash
# Docker 构建诊断脚本

set -e

echo "=========================================="
echo "Docker 构建诊断工具"
echo "=========================================="

cd /www/wwwroot/linklore

echo ""
echo "=== 1. 检查 Dockerfile ==="
if [ -f "Dockerfile" ]; then
    echo "✓ Dockerfile 存在"
    echo "检查修复代码是否存在..."
    if grep -q "Fixing pnpm symlinks" Dockerfile; then
        echo "✓ 修复代码存在"
    else
        echo "✗ 修复代码不存在！"
    fi
else
    echo "✗ Dockerfile 不存在"
    exit 1
fi

echo ""
echo "=== 2. 检查构建日志（如果有）==="
if [ -f "/tmp/build.log" ]; then
    echo "检查构建日志中的关键信息..."
    grep -i "Fixing pnpm\|Copying .pnpm\|Copying next\|next module" /tmp/build.log | tail -20 || echo "未找到相关日志"
else
    echo "构建日志不存在，开始构建..."
fi

echo ""
echo "=== 3. 重新构建并查看详细输出 ==="
echo "开始构建（会显示详细输出）..."
docker-compose build --no-cache web 2>&1 | tee /tmp/build.log | grep -E "Fixing|Copying|next|Error|Warning|✓|✗" | tail -30

echo ""
echo "=== 4. 检查构建后的镜像内容 ==="
echo "检查 standalone 输出中的 node_modules..."
docker run --rm --entrypoint sh linklore-web -c "
    echo '=== 检查 node_modules 目录 ==='
    ls -la /app/node_modules/ | head -20
    echo ''
    echo '=== 检查 next 模块 ==='
    ls -la /app/node_modules/next 2>/dev/null || echo 'next 模块不存在！'
    echo ''
    echo '=== 检查 .pnpm 目录 ==='
    ls -la /app/node_modules/.pnpm 2>/dev/null | head -10 || echo '.pnpm 目录不存在'
    echo ''
    echo '=== 检查 server.js ==='
    ls -la /app/server.js 2>/dev/null || echo 'server.js 不存在'
    echo ''
    echo '=== 检查 next 模块内容（如果存在） ==='
    if [ -d '/app/node_modules/next' ] || [ -L '/app/node_modules/next' ]; then
        ls -la /app/node_modules/next/ | head -10
        echo ''
        echo '检查 next 的 package.json'
        cat /app/node_modules/next/package.json 2>/dev/null | head -5 || echo 'package.json 不存在'
    fi
"

echo ""
echo "=== 5. 检查符号链接目标 ==="
docker run --rm --entrypoint sh linklore-web -c "
    if [ -L '/app/node_modules/next' ]; then
        echo 'next 是符号链接'
        echo '链接目标:'
        readlink -f /app/node_modules/next || echo '无法解析符号链接'
        echo ''
        echo '检查目标是否存在:'
        TARGET=\$(readlink -f /app/node_modules/next)
        if [ -d \"\$TARGET\" ]; then
            echo '✓ 目标存在'
            ls -la \"\$TARGET\" | head -5
        else
            echo '✗ 目标不存在！'
        fi
    else
        echo 'next 不是符号链接（是目录或不存在）'
    fi
"

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "如果 next 模块不存在，请检查构建日志："
echo "  tail -100 /tmp/build.log"

