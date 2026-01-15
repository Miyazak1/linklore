
FROM node:20-alpine AS builder

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# 复制所有文件 (由于 worker 依赖 apps/web 的代码，我们需要整个 monorepo context)
COPY . .

# 安装依赖
RUN pnpm install --frozen-lockfile

# 生成 Prisma Client
RUN pnpm prisma:generate

# 构建 worker
WORKDIR /app/worker/ai-queue
# 这里的 build 会使用 tsc 编译
RUN pnpm build

# 生产运行环境
FROM node:20-alpine AS runner

WORKDIR /app

# 安装 pnpm
RUN apk add --no-cache libc6-compat && \
    corepack enable && \
    corepack prepare pnpm@9.0.0 --activate

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 从 builder 复制所有内容
# 注意：由于 worker 运行时可能依赖 apps/web (通过 shim) 和 node_modules，
# 最稳妥的方式是保留整个构建后的环境。
# 以后可以通过优化 .npmignore 和使用 pnpm deploy 来减小体积。
COPY --from=builder --chown=nextjs:nodejs /app ./

# 切换到 worker 目录
WORKDIR /app/worker/ai-queue

USER nextjs

ENV NODE_ENV=production

# 启动 worker
CMD ["npm", "start"]
