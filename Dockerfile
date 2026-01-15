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

# 在 builder 阶段创建扁平的 node_modules（解决符号链接问题）
# 使用 tar 复制整个 node_modules，自动解析所有符号链接
WORKDIR /app/apps/web
RUN echo "Creating flat node_modules structure using tar (resolves symlinks)..." && \
    mkdir -p /tmp/flat-node_modules && \
    # 使用 tar 复制整个 node_modules，-h 选项会跟随符号链接
    cd node_modules && \
    tar -chf - . | tar -xf - -C /tmp/flat-node_modules && \
    # 验证关键模块是否存在
    echo "Verifying critical modules..." && \
    MISSING="" && \
    for mod in "next" "styled-jsx" "react" "react-dom"; do \
      if [ -d "/tmp/flat-node_modules/$mod" ] && [ -f "/tmp/flat-node_modules/$mod/package.json" ]; then \
        echo "✓ $mod found"; \
      else \
        echo "✗ $mod NOT found, searching in .pnpm..." && \
        # 在 .pnpm 中查找并复制
        found=$(find .pnpm -type d -name "$mod" -path "*/node_modules/$mod" 2>/dev/null | head -1); \
        if [ -n "$found" ] && [ -d "$found" ]; then \
          cp -r "$found" "/tmp/flat-node_modules/$mod" && \
          echo "  ✓ $mod copied from .pnpm: $found"; \
        else \
          echo "  ✗ $mod still not found!" && \
          MISSING="$MISSING $mod"; \
        fi; \
      fi; \
    done && \
    if [ -n "$MISSING" ]; then \
      echo "ERROR: Missing modules:$MISSING" && \
      echo "Available modules in flat structure:" && \
      ls -la /tmp/flat-node_modules/ | head -20 && \
      echo "Searching for styled-jsx in .pnpm:" && \
      find .pnpm -type d -name "*styled-jsx*" 2>/dev/null | head -5 || echo "Not found" && \
      exit 1; \
    fi && \
    echo "✓ Flat node_modules structure created successfully"

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

# 复制扁平的 node_modules（已解决符号链接问题）
COPY --from=builder --chown=nextjs:nodejs /tmp/flat-node_modules ./node_modules

# 最终验证关键模块
RUN echo "Final verification of critical modules..." && \
    for mod in "next" "styled-jsx" "react" "react-dom"; do \
      if [ -d "node_modules/$mod" ] && [ -f "node_modules/$mod/package.json" ]; then \
        echo "✓ $mod module verified"; \
      else \
        echo "✗ ERROR: $mod module still missing!" && \
        echo "  Checking node_modules structure:" && \
        ls -la node_modules/ | grep -E "($mod|\.bin)" | head -5 || echo "  Not found" && \
        exit 1; \
      fi; \
    done && \
    echo "✓ All critical modules verified successfully"

USER nextjs

# 暴露端口
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用（使用绝对路径，确保能找到 next）
CMD ["sh", "-c", "cd /app && if [ -f node_modules/.bin/next ]; then node_modules/.bin/next start -p 3000; elif [ -f node_modules/next/dist/bin/next ]; then node node_modules/next/dist/bin/next start -p 3000; else echo 'ERROR: next not found!' && ls -la node_modules/.bin/ 2>/dev/null | head -10 && exit 1; fi"]

