# ============================================
# Mooyu - Next.js Standalone Dockerfile
# ============================================

# 阶段 1: 依赖安装和构建
FROM node:20-alpine AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY prisma ./prisma/

# 安装依赖
RUN pnpm install --no-frozen-lockfile

# 复制所有源代码
COPY . .

# 生成 Prisma Client
RUN pnpm prisma generate

# 构建 Next.js（启用 standalone 模式）
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV ENABLE_STANDALONE=true
RUN pnpm build

# 验证 standalone 输出是否生成
WORKDIR /app/apps/web
RUN if [ ! -d ".next/standalone" ]; then \
      echo "ERROR: Standalone output not found. Build may have failed." && \
      ls -la .next/ 2>/dev/null | head -10 && \
      exit 1; \
    else \
      echo "✓ Standalone output found at .next/standalone"; \
      echo "Checking standalone structure..." && \
      find .next/standalone -name "server.js" -o -name "package.json" | head -5 && \
      echo "✓ Standalone build verified"; \
    fi

# 阶段 2: 生产运行环境
FROM node:20-alpine AS runner

WORKDIR /app

# 安装必要的系统依赖和 pnpm
RUN apk add --no-cache libc6-compat && \
    corepack enable && \
    corepack prepare pnpm@9.0.0 --activate

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 使用 Next.js standalone 输出（包含所有依赖）
# standalone 目录结构会保留相对路径：.next/standalone/apps/web/
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# 复制 Prisma schema（standalone 可能不包含）
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# 验证关键文件是否存在
RUN echo "Verifying standalone installation..." && \
    if [ -f "apps/web/server.js" ]; then \
      echo "✓ Found server.js at apps/web/server.js"; \
    elif [ -f "server.js" ]; then \
      echo "✓ Found server.js at root"; \
    else \
      echo "✗ ERROR: server.js not found!" && \
      find . -name "server.js" 2>/dev/null | head -5 && \
      ls -la apps/web/ 2>/dev/null || echo "apps/web/ directory not found" && \
      exit 1; \
    fi

USER nextjs

# 暴露端口
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用（使用 standalone 输出中的 server.js）
# 尝试多个可能的路径
CMD ["sh", "-c", "cd /app && if [ -f apps/web/server.js ]; then cd apps/web && node server.js; elif [ -f server.js ]; then node server.js; else echo 'ERROR: server.js not found!' && find . -name 'server.js' 2>/dev/null && exit 1; fi"]

