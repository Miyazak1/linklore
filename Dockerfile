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

# 构建 Next.js（不使用 standalone 模式，避免 pnpm 符号链接问题）
WORKDIR /app/apps/web
ENV NODE_ENV=production
# 暂时不使用 standalone 模式，直接使用标准构建
# ENV ENABLE_STANDALONE=true
RUN pnpm build

# 在 builder 阶段创建扁平化的 node_modules（解决符号链接问题）
WORKDIR /app/apps/web
RUN echo "Creating flattened node_modules to resolve symlinks..." && \
    mkdir -p node_modules_flat && \
    # 方法1：使用 cp -rL 跟随符号链接（Alpine Linux 支持 -L 选项）
    echo "Attempting cp -rL (follow symlinks)..." && \
    cp -rL node_modules node_modules_flat 2>&1 | head -3 && \
    # 验证 next 模块和 .bin 目录是否存在
    if [ -d "node_modules_flat/next" ] && [ -d "node_modules_flat/.bin" ]; then \
      echo "✓ next module and .bin directory found after cp -rL"; \
      ls -la node_modules_flat/next | head -3; \
      ls -la node_modules_flat/.bin/next 2>/dev/null && echo "✓ .bin/next exists" || echo "✗ .bin/next missing"; \
    else \
      echo "✗ next module or .bin not found, trying alternative method..."; \
      # 方法2：直接复制 .pnpm 和所有符号链接目标
      if [ -d "node_modules/.pnpm" ]; then \
        echo "Copying .pnpm directory..."; \
        mkdir -p node_modules_flat/.pnpm && \
        cp -r node_modules/.pnpm/* node_modules_flat/.pnpm/ 2>&1 | head -3; \
      fi && \
      # 复制所有符号链接的实际目标
      echo "Resolving and copying symlink targets..."; \
      for link in node_modules/*; do \
        if [ -L "$link" ]; then \
          target=$(readlink -f "$link" 2>/dev/null || readlink "$link"); \
          if [ -d "$target" ] || [ -f "$target" ]; then \
            name=$(basename "$link"); \
            echo "Copying $name from $target"; \
            cp -r "$target" "node_modules_flat/$name" 2>/dev/null || true; \
          fi; \
        elif [ -d "$link" ] || [ -f "$link" ]; then \
          name=$(basename "$link"); \
          cp -r "$link" "node_modules_flat/$name" 2>/dev/null || true; \
        fi; \
      done && \
      # 确保 .bin 目录被复制
      if [ -d "node_modules/.bin" ]; then \
        echo "Copying .bin directory..."; \
        mkdir -p node_modules_flat/.bin && \
        cp -r node_modules/.bin/* node_modules_flat/.bin/ 2>&1 | head -3 || true; \
      fi && \
      # 最终验证
      if [ -d "node_modules_flat/next" ]; then \
        echo "✓ next module found after alternative method"; \
        if [ -f "node_modules_flat/.bin/next" ] || [ -L "node_modules_flat/.bin/next" ]; then \
          echo "✓ .bin/next found"; \
        else \
          echo "✗ Warning: .bin/next not found, will use npx"; \
        fi; \
      else \
        echo "✗ ERROR: next module still not found!"; \
        ls -la node_modules_flat/ | head -10; \
        exit 1; \
      fi; \
    fi

# 阶段 2: 生产运行环境
FROM node:20-alpine AS runner

WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制应用文件
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./package.json

# 复制扁平化的 node_modules（已解决符号链接问题）
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/node_modules_flat ./node_modules

# 复制 Prisma schema
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

# 暴露端口
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用（使用 npx 或直接调用 next）
# 如果 node_modules/.bin/next 不存在，使用 npx
CMD ["sh", "-c", "if [ -f node_modules/.bin/next ]; then node_modules/.bin/next start -p 3000; else npx next start -p 3000; fi"]

