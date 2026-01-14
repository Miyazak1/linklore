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
RUN pnpm install --frozen-lockfile

# 复制所有源代码
COPY . .

# 生成 Prisma Client
RUN pnpm prisma generate

# 构建 Next.js
WORKDIR /app/apps/web
ENV NODE_ENV=production
RUN pnpm build

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

# 复制 package 文件（用于安装生产依赖）
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./root-package.json
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-lock.yaml ./
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./package.json

# 复制应用构建产物
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public

# 复制 Prisma schema
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# 安装生产依赖（这会创建正确的 node_modules，无需处理符号链接）
RUN pnpm install --prod --frozen-lockfile && \
    # 验证关键模块
    echo "Verifying critical modules..." && \
    for mod in "next" "styled-jsx" "react" "react-dom"; do \
      if [ ! -d "node_modules/$mod" ] && [ ! -f "node_modules/$mod/package.json" ]; then \
        echo "✗ ERROR: $mod module not found!" && \
        exit 1; \
      else \
        echo "✓ $mod module found"; \
      fi; \
    done && \
    echo "✓ All critical modules verified"

USER nextjs

# 暴露端口
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node_modules/.bin/next", "start", "-p", "3000"]

