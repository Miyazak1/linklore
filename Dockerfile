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

# 在 builder 阶段创建扁平化的 node_modules（彻底解决符号链接问题）
WORKDIR /app/apps/web
RUN echo "Creating flattened node_modules to resolve symlinks..." && \
    mkdir -p node_modules_flat && \
    # 方法1：先复制整个 .pnpm 目录（包含所有实际包）
    if [ -d "node_modules/.pnpm" ]; then \
      echo "Copying .pnpm directory (contains all actual packages)..." && \
      cp -r node_modules/.pnpm node_modules_flat/.pnpm 2>&1 | head -5 || true; \
    fi && \
    # 方法2：使用 find 和 cp -rL 递归复制所有符号链接目标
    echo "Resolving and copying all symlink targets..." && \
    find node_modules -maxdepth 1 -type l -exec sh -c ' \
      link="$1"; \
      name=$(basename "$link"); \
      target=$(readlink -f "$link" 2>/dev/null || readlink "$link"); \
      if [ -n "$target" ] && [ -e "$target" ]; then \
        echo "Copying $name from $target"; \
        if [ -d "$target" ]; then \
          cp -r "$target" "node_modules_flat/$name" 2>/dev/null || true; \
        elif [ -f "$target" ]; then \
          mkdir -p "node_modules_flat/$(dirname "$name")" && \
          cp "$target" "node_modules_flat/$name" 2>/dev/null || true; \
        fi; \
      fi \
    ' _ {} \; && \
    # 方法3：复制所有非符号链接的目录和文件
    echo "Copying non-symlink directories and files..." && \
    for item in node_modules/*; do \
      if [ ! -L "$item" ]; then \
        name=$(basename "$item"); \
        if [ -d "$item" ] && [ ! -d "node_modules_flat/$name" ]; then \
          echo "Copying directory $name"; \
          cp -r "$item" "node_modules_flat/$name" 2>/dev/null || true; \
        elif [ -f "$item" ] && [ ! -f "node_modules_flat/$name" ]; then \
          echo "Copying file $name"; \
          cp "$item" "node_modules_flat/$name" 2>/dev/null || true; \
        fi; \
      fi; \
    done && \
    # 方法4：确保 .bin 目录被完整复制（包括所有可执行文件）
    if [ -d "node_modules/.bin" ]; then \
      echo "Copying .bin directory..." && \
      mkdir -p node_modules_flat/.bin && \
      cp -r node_modules/.bin/* node_modules_flat/.bin/ 2>&1 | head -5 || true; \
      # 如果 .bin 中有符号链接，也要解析
      find node_modules/.bin -type l -exec sh -c ' \
        link="$1"; \
        name=$(basename "$link"); \
        target=$(readlink -f "$link" 2>/dev/null || readlink "$link"); \
        if [ -n "$target" ] && [ -e "$target" ]; then \
          cp "$target" "node_modules_flat/.bin/$name" 2>/dev/null || true; \
        fi \
      ' _ {} \; || true; \
    fi && \
    # 最终验证关键模块
    echo "Verifying critical modules..." && \
    MISSING="" && \
    for mod in "next" "styled-jsx" "react" "react-dom"; do \
      if [ ! -d "node_modules_flat/$mod" ] && [ ! -f "node_modules_flat/$mod/package.json" ]; then \
        echo "✗ ERROR: $mod module not found!" && \
        MISSING="$MISSING $mod"; \
      else \
        echo "✓ $mod module found"; \
      fi; \
    done && \
    if [ -n "$MISSING" ]; then \
      echo "Missing modules:$MISSING" && \
      echo "Available modules:" && \
      ls -la node_modules_flat/ | head -20 && \
      exit 1; \
    fi && \
    echo "✓ All critical modules verified"

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

