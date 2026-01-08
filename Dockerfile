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

# 复制 static 和 public 到 standalone 目录
RUN cp -r .next/static .next/standalone/apps/web/.next/ && \
    cp -r public .next/standalone/apps/web/

# 确保 Prisma Client 被包含在 standalone 输出中
# standalone 模式应该已经包含了，但为了保险，我们手动复制
# 在 monorepo 中，Prisma 可能在根目录或 apps/web 的 node_modules 中
WORKDIR /app
RUN mkdir -p apps/web/.next/standalone/apps/web/node_modules && \
    if [ -d "node_modules/.prisma" ]; then \
      cp -r node_modules/.prisma apps/web/.next/standalone/apps/web/node_modules/.prisma 2>/dev/null || true; \
    fi && \
    if [ -d "node_modules/@prisma" ]; then \
      cp -r node_modules/@prisma apps/web/.next/standalone/apps/web/node_modules/@prisma 2>/dev/null || true; \
    fi && \
    if [ -d "apps/web/node_modules/.prisma" ]; then \
      cp -r apps/web/node_modules/.prisma apps/web/.next/standalone/apps/web/node_modules/.prisma 2>/dev/null || true; \
    fi && \
    if [ -d "apps/web/node_modules/@prisma" ]; then \
      cp -r apps/web/node_modules/@prisma apps/web/.next/standalone/apps/web/node_modules/@prisma 2>/dev/null || true; \
    fi

# 阶段 2: 生产运行环境
FROM node:20-alpine AS runner

WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 从 builder 复制 standalone 输出
# standalone 模式的输出结构: .next/standalone/apps/web/
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone/apps/web ./

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

