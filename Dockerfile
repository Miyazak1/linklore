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
# 使用 pnpm deploy 创建扁平结构（最可靠的方法）
WORKDIR /app/apps/web
RUN echo "Creating flat node_modules structure using pnpm deploy..." && \
    mkdir -p /tmp/flat-deploy && \
    # 使用 pnpm deploy 创建扁平结构（会解析所有符号链接）
    pnpm deploy /tmp/flat-deploy --filter=@linklore/web && \
    # 验证关键模块
    echo "Verifying modules in flat structure..." && \
    for mod in "next" "styled-jsx" "react" "react-dom"; do \
      if [ -d "/tmp/flat-deploy/node_modules/$mod" ] && [ -f "/tmp/flat-deploy/node_modules/$mod/package.json" ]; then \
        echo "✓ $mod found in flat structure"; \
      else \
        echo "✗ $mod NOT found, attempting fallback..." && \
        # 如果 pnpm deploy 失败，尝试从原始 node_modules 复制
        if [ -d "node_modules/$mod" ] || [ -L "node_modules/$mod" ]; then \
          mkdir -p /tmp/flat-deploy/node_modules && \
          cp -rL "node_modules/$mod" "/tmp/flat-deploy/node_modules/$mod" 2>/dev/null || \
          cp -r "node_modules/$mod" "/tmp/flat-deploy/node_modules/$mod" 2>/dev/null && \
          echo "  ✓ $mod copied from original node_modules"; \
        elif [ -d "node_modules/.pnpm" ]; then \
          found=$(find node_modules/.pnpm -type d -name "$mod" -path "*/node_modules/$mod" 2>/dev/null | head -1); \
          if [ -n "$found" ] && [ -d "$found" ]; then \
            mkdir -p /tmp/flat-deploy/node_modules && \
            cp -r "$found" "/tmp/flat-deploy/node_modules/$mod" && \
            echo "  ✓ $mod copied from .pnpm: $found"; \
          else \
            echo "  ✗ $mod not found anywhere!"; \
          fi; \
        fi; \
      fi; \
    done && \
    # 确保 .bin 目录也被复制
    if [ -d "node_modules/.bin" ]; then \
      mkdir -p /tmp/flat-deploy/node_modules/.bin && \
      cp -rL node_modules/.bin/* /tmp/flat-deploy/node_modules/.bin/ 2>/dev/null || \
      cp -r node_modules/.bin/* /tmp/flat-deploy/node_modules/.bin/ 2>/dev/null && \
      echo "✓ .bin directory copied"; \
    fi && \
    echo "Flat node_modules structure created successfully"

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
COPY --from=builder --chown=nextjs:nodejs /tmp/flat-deploy/node_modules ./node_modules

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

