#!/bin/bash
set -euo pipefail

# LinkLore 数据库重置脚本
# 清空数据库并重新构建

echo "=========================================="
echo "LinkLore 数据库重置脚本"
echo "=========================================="
echo ""
echo "⚠️  警告：此操作会删除所有数据！"
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误：请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 确认操作
read -p "确定要清空数据库并重新构建吗？(yes/no) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}操作已取消${NC}"
    exit 0
fi

# 1. 停止服务
echo -e "\n${BLUE}[1/7] 停止 PM2 服务...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop all || true
    sleep 2
    echo -e "${GREEN}✓ PM2 服务已停止${NC}"
else
    echo -e "${YELLOW}未安装 PM2，跳过${NC}"
fi

# 2. 清空数据库
echo -e "\n${BLUE}[2/7] 清空数据库...${NC}"
echo -e "${YELLOW}正在重置数据库（删除所有表和数据）...${NC}"
if pnpm prisma migrate reset --force; then
    echo -e "${GREEN}✓ 数据库已清空${NC}"
else
    echo -e "${RED}错误：数据库重置失败${NC}"
    echo -e "${YELLOW}提示：可以尝试手动清空数据库${NC}"
    exit 1
fi

# 3. 运行迁移
echo -e "\n${BLUE}[3/7] 运行数据库迁移...${NC}"
if pnpm prisma migrate deploy; then
    echo -e "${GREEN}✓ 数据库迁移完成${NC}"
else
    echo -e "${RED}错误：数据库迁移失败${NC}"
    exit 1
fi

# 4. 执行手动 SQL
echo -e "\n${BLUE}[4/7] 执行手动 SQL 文件...${NC}"

# 检查并执行手动 SQL 文件
MANUAL_SQL_FILES=(
    "prisma/migrations/manual_add_book_categories.sql"
    "prisma/migrations/manual_add_baike_game_models.sql"
    "prisma/migrations/manual_add_chat_models.sql"
)

for sql_file in "${MANUAL_SQL_FILES[@]}"; do
    if [ -f "$sql_file" ]; then
        echo -e "${YELLOW}执行: $sql_file${NC}"
        if pnpm prisma db execute --file "$sql_file" --schema prisma/schema.prisma 2>/dev/null; then
            echo -e "${GREEN}✓ $sql_file 执行成功${NC}"
        else
            echo -e "${YELLOW}⚠ $sql_file 执行失败（可能已存在，可忽略）${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ $sql_file 不存在，跳过${NC}"
    fi
done

# 5. 生成 Prisma Client
echo -e "\n${BLUE}[5/7] 生成 Prisma Client...${NC}"
if pnpm prisma:generate; then
    echo -e "${GREEN}✓ Prisma Client 已生成${NC}"
else
    echo -e "${RED}错误：Prisma Client 生成失败${NC}"
    exit 1
fi

# 6. 构建项目
echo -e "\n${BLUE}[6/7] 构建项目...${NC}"
echo -e "${YELLOW}正在构建项目（这可能需要几分钟）...${NC}"
if pnpm build; then
    echo -e "${GREEN}✓ 项目构建成功${NC}"
else
    echo -e "${RED}错误：项目构建失败${NC}"
    exit 1
fi

# 7. 重启服务
echo -e "\n${BLUE}[7/7] 重启服务...${NC}"
if command -v pm2 &> /dev/null; then
    if pm2 restart ecosystem.config.js 2>/dev/null; then
        echo -e "${GREEN}✓ 服务已重启${NC}"
    else
        echo -e "${YELLOW}尝试启动服务...${NC}"
        pm2 start ecosystem.config.js
        echo -e "${GREEN}✓ 服务已启动${NC}"
    fi
else
    echo -e "${YELLOW}未安装 PM2，请手动启动服务${NC}"
fi

# 完成
echo -e "\n=========================================="
echo -e "${GREEN}数据库重置完成！${NC}"
echo -e "=========================================="
echo ""
echo "下一步操作："
echo ""
echo "1. 查看服务状态："
echo -e "   ${YELLOW}pm2 status${NC}"
echo ""
echo "2. 查看日志："
echo -e "   ${YELLOW}pm2 logs --lines 20${NC}"
echo ""
echo "3. 访问网站测试功能"
echo ""
echo "4. 重新注册用户（数据已清空）"
echo ""




