#!/bin/bash

# ============================================
# Mooyu Docker 部署脚本
# ============================================

set -e

echo "=========================================="
echo "Mooyu Docker 部署脚本"
echo "=========================================="

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    exit 1
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}警告: .env 文件不存在，创建示例文件${NC}"
    cat > .env << 'EOF'
# 数据库配置（已在 docker-compose.yml 中配置）
# DATABASE_URL=postgresql://mooyu:fdn4jjKXGZ56LJLh@postgres:5432/mooyu

# 会话密钥（请修改为随机字符串）
SESSION_SECRET=mooyu-secret-change-this-to-random-32-chars-minimum

# Redis 密码（可选）
# REDIS_PASSWORD=

# 应用 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OSS 配置
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket-name

# AI 配置
AI_DEFAULT_PROVIDER=openai
AI_ALLOWED_PROVIDERS=openai,qwen
AI_FALLBACK_PROVIDER=qwen
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50

# 队列配置
QUEUE_CONCURRENCY=1

# 文件配置
MAX_FILE_SIZE_MB=20
ALLOWED_EXT=doc,docx,txt,md
EOF
    echo -e "${GREEN}已创建 .env 文件，请编辑后重新运行${NC}"
    exit 0
fi

# 加载环境变量
export $(cat .env | grep -v '^#' | xargs)

# 选择部署模式
echo ""
echo "选择部署模式:"
echo "1) 开发模式 (docker-compose.yml)"
echo "2) 生产模式 (docker-compose.yml + docker-compose.prod.yml)"
read -p "请选择 [1/2]: " mode

COMPOSE_FILES="-f docker-compose.yml"
if [ "$mode" = "2" ]; then
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.prod.yml"
    echo -e "${YELLOW}使用生产模式${NC}"
else
    echo -e "${YELLOW}使用开发模式${NC}"
fi

# 停止旧容器
echo ""
echo "停止旧容器..."
docker-compose $COMPOSE_FILES down

# 构建镜像
echo ""
echo "构建 Docker 镜像（这可能需要几分钟）..."
docker-compose $COMPOSE_FILES build --no-cache

# 启动服务
echo ""
echo "启动服务..."
docker-compose $COMPOSE_FILES up -d

# 等待数据库就绪
echo ""
echo "等待数据库就绪..."
sleep 5

# 运行数据库迁移
echo ""
echo "运行数据库迁移..."
docker-compose $COMPOSE_FILES exec -T web node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('数据库连接成功');
    return prisma.\$disconnect();
  })
  .catch((err) => {
    console.error('数据库连接失败:', err);
    process.exit(1);
  });
" || echo -e "${YELLOW}注意: 数据库迁移可能需要手动执行${NC}"

# 查看服务状态
echo ""
echo "=========================================="
echo "服务状态:"
echo "=========================================="
docker-compose $COMPOSE_FILES ps

echo ""
echo "=========================================="
echo "查看日志:"
echo "=========================================="
docker-compose $COMPOSE_FILES logs --tail=20

echo ""
echo -e "${GREEN}部署完成！${NC}"
echo ""
echo "服务地址:"
echo "  - Web: http://localhost:3000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "常用命令:"
echo "  - 查看日志: docker-compose $COMPOSE_FILES logs -f"
echo "  - 停止服务: docker-compose $COMPOSE_FILES down"
echo "  - 重启服务: docker-compose $COMPOSE_FILES restart"
echo "  - 进入容器: docker-compose $COMPOSE_FILES exec web sh"
echo ""




