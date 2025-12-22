#!/bin/bash
set -euo pipefail

# LinkLore 宝塔面板更新脚本
# 用于清理旧部署并拉取最新代码

echo "=========================================="
echo "LinkLore 宝塔面板更新脚本"
echo "=========================================="

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

# 1. 停止所有 PM2 进程
echo -e "\n${BLUE}[1/8] 停止所有 PM2 进程...${NC}"
if command -v pm2 &> /dev/null; then
    # 检查是否有运行中的进程
    if pm2 list | grep -q "online\|stopped"; then
        echo -e "${YELLOW}正在停止所有 PM2 进程...${NC}"
        pm2 stop all || true
        sleep 2
        echo -e "${GREEN}✓ 所有 PM2 进程已停止${NC}"
    else
        echo -e "${GREEN}✓ 没有运行中的 PM2 进程${NC}"
    fi
else
    echo -e "${YELLOW}未安装 PM2，跳过${NC}"
fi

# 2. 删除 PM2 进程（可选，注释掉以保留配置）
echo -e "\n${BLUE}[2/8] 删除 PM2 进程配置...${NC}"
if command -v pm2 &> /dev/null; then
    read -p "是否删除所有 PM2 进程配置？(y/n，默认n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pm2 delete all || true
        echo -e "${GREEN}✓ PM2 进程配置已删除${NC}"
    else
        echo -e "${YELLOW}保留 PM2 进程配置${NC}"
    fi
fi

# 3. 检查 Git 仓库
echo -e "\n${BLUE}[3/8] 检查 Git 仓库...${NC}"
if [ ! -d ".git" ]; then
    echo -e "${RED}错误：当前目录不是 Git 仓库${NC}"
    exit 1
fi

# 检查远程仓库
if ! git remote | grep -q "origin"; then
    echo -e "${RED}错误：未配置 Git 远程仓库${NC}"
    exit 1
fi

REMOTE_URL=$(git remote get-url origin)
echo -e "${GREEN}✓ Git 远程仓库：${REMOTE_URL}${NC}"

# 4. 拉取最新代码
echo -e "\n${BLUE}[4/8] 拉取最新代码...${NC}"
echo -e "${YELLOW}正在从 GitHub 拉取最新代码...${NC}"

# 保存当前分支
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}当前分支：${CURRENT_BRANCH}${NC}"

# 拉取代码
if git pull origin "${CURRENT_BRANCH}"; then
    echo -e "${GREEN}✓ 代码拉取成功${NC}"
else
    echo -e "${RED}错误：代码拉取失败${NC}"
    echo -e "${YELLOW}提示：如果遇到冲突，请手动解决后重新运行此脚本${NC}"
    exit 1
fi

# 显示最新提交信息
LATEST_COMMIT=$(git log -1 --oneline)
echo -e "${GREEN}最新提交：${LATEST_COMMIT}${NC}"

# 5. 检查 Node.js 版本
echo -e "\n${BLUE}[5/8] 检查 Node.js 版本...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误：未安装 Node.js${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js 版本：${NODE_VERSION}${NC}"

# 6. 检查 pnpm
echo -e "\n${BLUE}[6/8] 检查 pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}未安装 pnpm，正在安装...${NC}"
    corepack enable || npm install -g pnpm@9.0.0
fi

echo -e "${GREEN}✓ pnpm 版本：$(pnpm -v)${NC}"

# 7. 更新依赖
echo -e "\n${BLUE}[7/8] 更新项目依赖...${NC}"
echo -e "${YELLOW}正在安装/更新依赖（这可能需要几分钟）...${NC}"
pnpm install --frozen-lockfile

# 8. 生成 Prisma Client
echo -e "\n${BLUE}[8/8] 生成 Prisma Client...${NC}"
pnpm prisma:generate

# 9. 运行数据库迁移（可选）
echo -e "\n${BLUE}[9/10] 数据库迁移...${NC}"
read -p "是否运行数据库迁移？(y/n，默认n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pnpm prisma:migrate
    echo -e "${GREEN}✓ 数据库迁移完成${NC}"
else
    echo -e "${YELLOW}跳过数据库迁移${NC}"
fi

# 10. 构建项目
echo -e "\n${BLUE}[10/10] 构建项目...${NC}"
echo -e "${YELLOW}正在构建项目（这可能需要几分钟）...${NC}"
pnpm build

# 11. 创建日志目录
echo -e "\n${BLUE}[11/11] 创建日志目录...${NC}"
mkdir -p logs
echo -e "${GREEN}✓ 日志目录已创建${NC}"

# 12. 完成提示
echo -e "\n=========================================="
echo -e "${GREEN}更新完成！${NC}"
echo -e "=========================================="
echo ""
echo "下一步操作："
echo ""
echo "1. 启动 PM2 服务："
echo -e "   ${YELLOW}pm2 start ecosystem.config.js${NC}"
echo ""
echo "2. 或者使用宝塔 PM2 管理器："
echo "   - 软件商店 → PM2 管理器"
echo "   - 添加或启动项目"
echo ""
echo "3. 查看服务状态："
echo -e "   ${YELLOW}pm2 status${NC}"
echo ""
echo "4. 查看日志："
echo -e "   ${YELLOW}pm2 logs${NC}"
echo ""
echo "5. 设置开机自启（如果还没有）："
echo -e "   ${YELLOW}pm2 startup${NC}"
echo -e "   ${YELLOW}pm2 save${NC}"
echo ""

