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

# 复制应用构建产物
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./package.json

# 复制 Prisma schema
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# 直接从 builder 阶段复制完整的 node_modules（包括 .pnpm 和所有符号链接）
# 这样可以确保所有依赖（包括 styled-jsx）都被正确复制
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/node_modules ./node_modules

# 验证关键模块
RUN echo "Verifying critical modules..." && \
    for mod in "next" "styled-jsx" "react" "react-dom"; do \
      # 检查模块是否存在（可能是目录或符号链接）
      if [ ! -e "node_modules/$mod" ] && [ ! -e "node_modules/$mod/package.json" ]; then \
        echo "✗ ERROR: $mod module not found!" && \
        # 尝试在 .pnpm 中查找
        if [ -d "node_modules/.pnpm" ]; then \
          found=$(find node_modules/.pnpm -type d -name "$mod" -path "*/node_modules/$mod" 2>/dev/null | head -1); \
          if [ -n "$found" ]; then \
            echo "  Found in .pnpm: $found" && \
            # 创建符号链接或复制
            mkdir -p "node_modules/$(dirname "$mod")" 2>/dev/null || true; \
            if [ -d "$found" ]; then \
              cp -r "$found" "node_modules/$mod" 2>/dev/null || true; \
              if [ -d "node_modules/$mod" ]; then \
                echo "  ✓ $mod copied from .pnpm"; \
                continue; \
              fi; \
            fi; \
          fi; \
        fi && \
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

