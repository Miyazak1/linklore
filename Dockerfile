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

# 复制 Prisma schema 和生成的 client（用于运行时）
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

# 暴露端口
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用（standalone 模式下 server.js 在根目录）
CMD ["node", "server.js"]

