#!/bin/bash
set -euo pipefail

# LinkLore 生产环境部署脚本
# 适用于阿里云服务器（Alibaba Cloud Linux / CentOS / Ubuntu）

echo "=========================================="
echo "LinkLore 生产环境部署脚本"
echo "=========================================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否以 root 或 sudo 运行
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}提示：建议使用 sudo 运行此脚本${NC}"
fi

# 1. 检查 Node.js 版本
echo -e "\n[1/8] 检查 Node.js 版本..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误：未安装 Node.js${NC}"
    echo "请先安装 Node.js 20.11.0 或更高版本"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1,2)
REQUIRED_VERSION="20.11"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}错误：Node.js 版本过低（当前：$NODE_VERSION，需要：$REQUIRED_VERSION+）${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js 版本：$(node -v)${NC}"

# 2. 检查 pnpm
echo -e "\n[2/8] 检查 pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}未安装 pnpm，正在安装...${NC}"
    corepack enable || npm install -g pnpm@9.0.0
fi

echo -e "${GREEN}✓ pnpm 版本：$(pnpm -v)${NC}"

# 3. 检查 PM2
echo -e "\n[3/8] 检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}未安装 PM2，正在安装...${NC}"
    npm install -g pm2
fi

echo -e "${GREEN}✓ PM2 版本：$(pm2 -v)${NC}"

# 4. 检查环境变量文件
echo -e "\n[4/8] 检查环境变量配置..."
if [ ! -f "apps/web/.env.production" ]; then
    echo -e "${YELLOW}未找到 apps/web/.env.production${NC}"
    if [ -f "apps/web/.env.production.example" ]; then
        echo "正在从模板创建..."
        cp apps/web/.env.production.example apps/web/.env.production
        echo -e "${RED}请编辑 apps/web/.env.production 并填写实际配置值！${NC}"
        echo "完成后重新运行此脚本"
        exit 1
    else
        echo -e "${RED}错误：未找到环境变量模板文件${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ 环境变量文件已配置${NC}"

# 5. 安装依赖
echo -e "\n[5/8] 安装项目依赖..."
pnpm install --frozen-lockfile --prod=false

# 6. 生成 Prisma Client
echo -e "\n[6/8] 生成 Prisma Client..."
pnpm prisma:generate

# 7. 运行数据库迁移
echo -e "\n[7/8] 运行数据库迁移..."
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

# 10. 启动服务
echo -e "\n=========================================="
echo -e "${GREEN}部署完成！${NC}"
echo -e "=========================================="
echo ""
echo "下一步操作："
echo "1. 检查环境变量配置：apps/web/.env.production"
echo "2. 启动服务：pm2 start ecosystem.config.js"
echo "3. 查看状态：pm2 status"
echo "4. 查看日志：pm2 logs"
echo "5. 设置开机自启：pm2 startup && pm2 save"
echo ""
echo "常用命令："
echo "  - 启动：pm2 start ecosystem.config.js"
echo "  - 停止：pm2 stop ecosystem.config.js"
echo "  - 重启：pm2 restart ecosystem.config.js"
echo "  - 查看状态：pm2 status"
echo "  - 查看日志：pm2 logs"
echo "  - 监控：pm2 monit"
echo ""

