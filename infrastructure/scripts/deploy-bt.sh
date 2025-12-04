#!/bin/bash
set -euo pipefail

# LinkLore 宝塔面板部署脚本
# 适用于使用宝塔面板的服务器

echo "=========================================="
echo "LinkLore 宝塔面板部署脚本"
echo "=========================================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误：请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 1. 检查 Node.js 版本
echo -e "\n[1/7] 检查 Node.js 版本..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误：未安装 Node.js${NC}"
    echo "请在宝塔面板中安装 Node.js 版本管理器，然后安装 Node.js 20.x"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1,2)
REQUIRED_VERSION="20.11"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}错误：Node.js 版本过低（当前：$NODE_VERSION，需要：$REQUIRED_VERSION+）${NC}"
    echo "请在宝塔面板中升级 Node.js 到 20.x 版本"
    exit 1
fi

echo -e "${GREEN}✓ Node.js 版本：$(node -v)${NC}"

# 2. 检查 pnpm
echo -e "\n[2/7] 检查 pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}未安装 pnpm，正在安装...${NC}"
    corepack enable || npm install -g pnpm@9.0.0
fi

echo -e "${GREEN}✓ pnpm 版本：$(pnpm -v)${NC}"

# 3. 检查 PM2
echo -e "\n[3/7] 检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}未安装 PM2，正在安装...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 已安装${NC}"
else
    echo -e "${GREEN}✓ PM2 版本：$(pm2 -v)${NC}"
fi

# 4. 检查环境变量文件
echo -e "\n[4/7] 检查环境变量配置..."
if [ ! -f "apps/web/.env.production" ]; then
    echo -e "${YELLOW}未找到 apps/web/.env.production${NC}"
    if [ -f "docs/ENV_PRODUCTION.md" ]; then
        echo "请参考 docs/ENV_PRODUCTION.md 创建环境变量文件"
        echo "或使用以下命令："
        echo "  cp apps/web/.env.production.example apps/web/.env.production"
        echo "  nano apps/web/.env.production"
    fi
    echo -e "${RED}请创建并配置 apps/web/.env.production 后重新运行此脚本${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 环境变量文件已配置${NC}"

# 5. 安装依赖
echo -e "\n[5/7] 安装项目依赖..."
pnpm install --frozen-lockfile --prod=false

# 6. 生成 Prisma Client
echo -e "\n[6/7] 生成 Prisma Client..."
pnpm prisma:generate

# 7. 运行数据库迁移
echo -e "\n[7/7] 运行数据库迁移..."
read -p "是否运行数据库迁移？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pnpm prisma:migrate
    echo -e "${GREEN}✓ 数据库迁移完成${NC}"
else
    echo -e "${YELLOW}跳过数据库迁移${NC}"
fi

# 8. 构建项目
echo -e "\n[8/8] 构建项目..."
pnpm build

# 9. 创建日志目录
echo -e "\n[9/9] 创建日志目录..."
mkdir -p logs

# 10. 完成
echo -e "\n=========================================="
echo -e "${GREEN}部署完成！${NC}"
echo -e "=========================================="
echo ""
echo "下一步操作："
echo "1. 在宝塔面板中配置网站和反向代理"
echo "2. 配置 SSL 证书"
echo "3. 使用 PM2 管理器启动服务，或运行："
echo "   pm2 start ecosystem.config.js"
echo "4. 设置开机自启：pm2 startup && pm2 save"
echo ""
echo "宝塔面板操作："
echo "  - 网站管理：网站 → 添加站点"
echo "  - SSL 证书：网站 → 设置 → SSL"
echo "  - 反向代理：网站 → 设置 → 反向代理"
echo "  - PM2 管理：软件商店 → PM2 管理器"
echo ""

