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

# 构建 Next.js（standalone 模式）
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV ENABLE_STANDALONE=true
RUN pnpm build

# 检查 standalone 输出结构并统一路径到 apps/web/.next/standalone-output
# standalone 模式在 monorepo 中的输出路径可能是 .next/standalone/ 或 .next/standalone/apps/web/
WORKDIR /app
RUN if [ -d "apps/web/.next/standalone/apps/web" ]; then \
      # 如果 standalone 在 apps/web 子目录，移动到统一位置
      mv apps/web/.next/standalone/apps/web apps/web/.next/standalone-output; \
    elif [ -d "apps/web/.next/standalone" ]; then \
      # 检查是否有 apps/web 子目录
      if [ -d "apps/web/.next/standalone/apps/web" ]; then \
        mv apps/web/.next/standalone/apps/web apps/web/.next/standalone-output; \
      else \
        # 直接使用 standalone 目录
        mv apps/web/.next/standalone apps/web/.next/standalone-output; \
      fi; \
    else \
      echo "Error: standalone output not found"; \
      ls -la apps/web/.next/ || true; \
      exit 1; \
    fi && \
    STANDALONE_DIR="apps/web/.next/standalone-output" && \
    # 复制 static 和 public 到 standalone 目录
    cp -r apps/web/.next/static $STANDALONE_DIR/.next/static && \
    cp -r apps/web/public $STANDALONE_DIR/public && \
    # 确保 Prisma Client 被包含
    mkdir -p $STANDALONE_DIR/node_modules && \
    if [ -d "node_modules/.prisma" ]; then \
      cp -r node_modules/.prisma $STANDALONE_DIR/node_modules/.prisma 2>/dev/null || true; \
    fi && \
    if [ -d "node_modules/@prisma" ]; then \
      cp -r node_modules/@prisma $STANDALONE_DIR/node_modules/@prisma 2>/dev/null || true; \
    fi && \
    if [ -d "apps/web/node_modules/.prisma" ]; then \
      cp -r apps/web/node_modules/.prisma $STANDALONE_DIR/node_modules/.prisma 2>/dev/null || true; \
    fi && \
    if [ -d "apps/web/node_modules/@prisma" ]; then \
      cp -r apps/web/node_modules/@prisma $STANDALONE_DIR/node_modules/@prisma 2>/dev/null || true; \
    fi && \
    # 修复 pnpm 符号链接问题：复制 .pnpm 目录
    # standalone 输出中的 node_modules 包含符号链接，指向 pnpm 的 .pnpm 目录
    if [ -d "node_modules/.pnpm" ]; then \
      echo "Copying pnpm .pnpm directory..."; \
      cp -r node_modules/.pnpm $STANDALONE_DIR/node_modules/.pnpm 2>/dev/null || true; \
    fi && \
    if [ -d "apps/web/node_modules/.pnpm" ]; then \
      echo "Copying web node_modules/.pnpm directory..."; \
      cp -r apps/web/node_modules/.pnpm $STANDALONE_DIR/node_modules/.pnpm 2>/dev/null || true; \
    fi && \
    # 验证 next 模块是否存在
    if [ ! -e "$STANDALONE_DIR/node_modules/next" ]; then \
      echo "Warning: next module not found, attempting to copy..."; \
      if [ -d "apps/web/node_modules/next" ]; then \
        cp -r apps/web/node_modules/next $STANDALONE_DIR/node_modules/next 2>/dev/null || true; \
      elif [ -d "node_modules/next" ]; then \
        cp -r node_modules/next $STANDALONE_DIR/node_modules/next 2>/dev/null || true; \
      fi; \
    fi && \
    # 输出 standalone 目录结构用于调试
    echo "Standalone directory structure:" && \
    ls -la $STANDALONE_DIR/ && \
    echo "Checking node_modules:" && \
    ls -la $STANDALONE_DIR/node_modules/ | head -10 && \
    echo "Checking for server.js:" && \
    ls -la $STANDALONE_DIR/server.js || ls -la $STANDALONE_DIR/*.js || true && \
    echo "Verifying next module:" && \
    ls -la $STANDALONE_DIR/node_modules/next 2>/dev/null || echo "Warning: next module not found"

# 阶段 2: 生产运行环境
FROM node:20-alpine AS runner

WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 从 builder 复制 standalone 输出
# 在 builder 阶段已经统一到 apps/web/.next/standalone-output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone-output ./

# 复制 static 文件（standalone 模式需要手动复制）
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

# 复制 public 文件
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public

# 复制 Prisma schema（用于运行时，如果需要）
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Prisma Client 应该已经在 standalone 输出的 node_modules 中了
# 如果没有，standalone 模式会自动处理，或者我们已经在 builder 阶段复制了

USER nextjs

# 暴露端口
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用（standalone 模式下 server.js 在根目录）
CMD ["node", "server.js"]

