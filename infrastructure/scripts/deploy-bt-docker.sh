#!/bin/bash
set -euo pipefail

# LinkLore 宝塔面板 Docker 部署脚本
# 适用于使用宝塔面板 + Docker 的服务器

echo "=========================================="
echo "LinkLore 宝塔面板 Docker 部署脚本"
echo "=========================================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否在正确的目录
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}错误：请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 1. 检查 Docker
echo -e "\n${BLUE}[1/8] 检查 Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误：未安装 Docker${NC}"
    echo "请先在宝塔面板中安装 Docker 管理器，或执行："
    echo "  curl -fsSL https://get.docker.com | bash"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}错误：Docker 服务未运行${NC}"
    echo "请启动 Docker 服务："
    echo "  systemctl start docker"
    exit 1
fi

echo -e "${GREEN}✓ Docker 版本：$(docker --version | cut -d' ' -f3 | cut -d',' -f1)${NC}"

# 2. 检查 Docker Compose
echo -e "\n${BLUE}[2/8] 检查 Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}错误：未安装 Docker Compose${NC}"
    echo "请安装 Docker Compose："
    echo "  curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "  chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    echo -e "${GREEN}✓ Docker Compose 版本：$(docker-compose --version | cut -d' ' -f4 | cut -d',' -f1)${NC}"
else
    COMPOSE_CMD="docker compose"
    echo -e "${GREEN}✓ Docker Compose 版本：$(docker compose version --short)${NC}"
fi

# 3. 检查环境变量文件
echo -e "\n${BLUE}[3/8] 检查环境变量配置...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}未找到 .env 文件${NC}"
    echo "正在创建 .env 文件模板..."
    
    cat > .env << 'EOF'
# PostgreSQL 数据库配置
POSTGRES_DB=linklore
POSTGRES_USER=linklore_user
POSTGRES_PASSWORD=请设置强密码（至少16位）

# Redis 配置（可选）
REDIS_PASSWORD=

# 会话密钥（必需，至少32字符）
# 生成方式：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=请生成32位随机字符串

# 阿里云 OSS 配置
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=你的AccessKey ID
OSS_ACCESS_KEY_SECRET=你的AccessKey Secret
OSS_BUCKET=你的Bucket名称

# AI 配置
AI_DEFAULT_PROVIDER=openai
AI_ALLOWED_PROVIDERS=openai,qwen
AI_FALLBACK_PROVIDER=qwen
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50

# 队列配置
QUEUE_CONCURRENCY=1

# 文件上传配置
MAX_FILE_SIZE_MB=20
ALLOWED_EXT=doc,docx,txt,md

# 生产环境配置
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
EOF
    
    echo -e "${YELLOW}已创建 .env 文件模板，请编辑并填入实际配置后重新运行此脚本${NC}"
    echo "文件位置：$(pwd)/.env"
    exit 1
fi

# 检查必要的环境变量
if grep -q "请设置\|请生成\|你的" .env; then
    echo -e "${YELLOW}警告：.env 文件中仍有占位符，请替换为实际值${NC}"
    read -p "是否继续？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓ 环境变量文件已配置${NC}"

# 4. 检查端口占用
echo -e "\n${BLUE}[4/8] 检查端口占用...${NC}"
if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo -e "${YELLOW}警告：端口 3000 已被占用${NC}"
    echo "占用端口的进程："
    netstat -tlnp 2>/dev/null | grep ":3000 " || true
    read -p "是否继续？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ 端口 3000 可用${NC}"
fi

# 5. 停止现有容器（如果存在）
echo -e "\n${BLUE}[5/8] 停止现有容器...${NC}"
if $COMPOSE_CMD ps | grep -q "Up"; then
    echo -e "${YELLOW}发现运行中的容器，正在停止...${NC}"
    $COMPOSE_CMD down
    echo -e "${GREEN}✓ 已停止现有容器${NC}"
else
    echo -e "${GREEN}✓ 没有运行中的容器${NC}"
fi

# 6. 构建镜像
echo -e "\n${BLUE}[6/8] 构建 Docker 镜像...${NC}"
echo -e "${YELLOW}这可能需要几分钟时间，请耐心等待...${NC}"
$COMPOSE_CMD build --no-cache web

echo -e "${GREEN}✓ 镜像构建完成${NC}"

# 7. 启动容器
echo -e "\n${BLUE}[7/8] 启动 Docker 容器...${NC}"
$COMPOSE_CMD up -d

echo -e "${GREEN}✓ 容器已启动${NC}"

# 8. 等待服务就绪
echo -e "\n${BLUE}[8/8] 等待服务就绪...${NC}"
echo -e "${YELLOW}等待数据库和 Redis 就绪...${NC}"

# 等待 PostgreSQL 就绪
for i in {1..30}; do
    if $COMPOSE_CMD exec -T postgres pg_isready -U ${POSTGRES_USER:-linklore_user} -d ${POSTGRES_DB:-linklore} &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL 已就绪${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}错误：PostgreSQL 启动超时${NC}"
        exit 1
    fi
    sleep 2
done

# 等待 Redis 就绪
for i in {1..30}; do
    if $COMPOSE_CMD exec -T redis redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓ Redis 已就绪${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}错误：Redis 启动超时${NC}"
        exit 1
    fi
    sleep 2
done

# 等待 Web 应用就绪
echo -e "${YELLOW}等待 Web 应用就绪...${NC}"
for i in {1..60}; do
    if curl -sf http://127.0.0.1:3000/api/health &> /dev/null; then
        echo -e "${GREEN}✓ Web 应用已就绪${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${YELLOW}警告：Web 应用启动超时，请检查日志${NC}"
        echo "查看日志：$COMPOSE_CMD logs web"
    fi
    sleep 2
done

# 9. 显示容器状态
echo -e "\n${BLUE}容器状态：${NC}"
$COMPOSE_CMD ps

# 10. 完成
echo -e "\n=========================================="
echo -e "${GREEN}部署完成！${NC}"
echo -e "=========================================="
echo ""
echo "下一步操作："
echo "1. 在宝塔面板中配置网站和反向代理"
echo "   - 网站 → 添加站点"
echo "   - 网站 → 设置 → 反向代理 → 目标 URL: http://127.0.0.1:3000"
echo "2. 配置 SSL 证书"
echo "   - 网站 → 设置 → SSL → Let's Encrypt"
echo "3. 运行数据库迁移（如果需要）"
echo "   - $COMPOSE_CMD exec web sh -c 'cd /app && npx prisma migrate deploy'"
echo ""
echo "常用命令："
echo "  查看日志：$COMPOSE_CMD logs -f"
echo "  重启服务：$COMPOSE_CMD restart"
echo "  停止服务：$COMPOSE_CMD stop"
echo "  启动服务：$COMPOSE_CMD start"
echo "  查看状态：$COMPOSE_CMD ps"
echo ""
echo "访问地址："
echo "  本地测试：http://127.0.0.1:3000"
echo "  健康检查：http://127.0.0.1:3000/api/health"
echo ""

