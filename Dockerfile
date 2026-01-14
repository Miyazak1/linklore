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

# 在 builder 阶段使用 pnpm deploy 创建完全扁平化的 node_modules（彻底解决符号链接问题）
WORKDIR /app/apps/web
RUN echo "Creating flattened node_modules using pnpm deploy..." && \
    mkdir -p node_modules_flat && \
    # 方法1：使用 pnpm deploy 创建扁平化的 node_modules（推荐方法）
    echo "Attempting pnpm deploy (creates flat node_modules without symlinks)..." && \
    pnpm deploy --filter=. --prod --dir node_modules_flat 2>&1 | tail -10 || \
    (echo "pnpm deploy failed, trying alternative method..." && \
     # 方法2：如果 pnpm deploy 失败，使用 cp -rL 递归跟随符号链接
     echo "Using cp -rL to follow all symlinks recursively..." && \
     cp -rL node_modules node_modules_flat 2>&1 | head -5 || \
     # 方法3：如果 cp -rL 也失败，手动复制 .pnpm 和解析所有符号链接
     (echo "cp -rL failed, using manual symlink resolution..." && \
      if [ -d "node_modules/.pnpm" ]; then \
        echo "Copying .pnpm directory..." && \
        cp -r node_modules/.pnpm node_modules_flat/.pnpm 2>&1 | head -3 || true; \
      fi && \
      # 递归查找并复制所有符号链接目标
      find node_modules -type l | while read link; do \
        name=$(basename "$link"); \
        rel_path=$(echo "$link" | sed 's|^node_modules/||'); \
        target=$(readlink -f "$link" 2>/dev/null || readlink "$link"); \
        if [ -n "$target" ] && [ -e "$target" ]; then \
          dest_dir="node_modules_flat/$(dirname "$rel_path")"; \
          mkdir -p "$dest_dir" 2>/dev/null || true; \
          if [ -d "$target" ]; then \
            cp -r "$target" "node_modules_flat/$rel_path" 2>/dev/null || true; \
          elif [ -f "$target" ]; then \
            cp "$target" "node_modules_flat/$rel_path" 2>/dev/null || true; \
          fi; \
        fi; \
      done && \
      # 复制所有非符号链接的目录
      find node_modules -type d ! -type l | while read dir; do \
        rel_path=$(echo "$dir" | sed 's|^node_modules/||'); \
        if [ -n "$rel_path" ] && [ "$rel_path" != "." ]; then \
          if [ ! -d "node_modules_flat/$rel_path" ] && [ ! -L "node_modules_flat/$rel_path" ]; then \
            mkdir -p "node_modules_flat/$rel_path" 2>/dev/null || true; \
            # 复制目录中的文件（非符号链接）
            find "$dir" -maxdepth 1 -type f ! -type l -exec cp {} "node_modules_flat/$rel_path/" 2>/dev/null \; || true; \
          fi; \
        fi; \
      done)) && \
    # 确保 .bin 目录被完整复制
    if [ -d "node_modules/.bin" ]; then \
      echo "Copying .bin directory..." && \
      mkdir -p node_modules_flat/.bin && \
      cp -rL node_modules/.bin/* node_modules_flat/.bin/ 2>&1 | head -3 || \
      (find node_modules/.bin -type l -exec sh -c ' \
        link="$1"; \
        name=$(basename "$link"); \
        target=$(readlink -f "$link" 2>/dev/null || readlink "$link"); \
        if [ -n "$target" ] && [ -e "$target" ]; then \
          cp "$target" "node_modules_flat/.bin/$name" 2>/dev/null || true; \
        fi \
      ' _ {} \; || true); \
    fi && \
    # 最终验证关键模块（包括 styled-jsx）
    echo "Verifying critical modules..." && \
    MISSING="" && \
    for mod in "next" "styled-jsx" "react" "react-dom"; do \
      if [ ! -d "node_modules_flat/$mod" ] && [ ! -f "node_modules_flat/$mod/package.json" ]; then \
        echo "✗ ERROR: $mod module not found!" && \
        # 尝试在 .pnpm 中查找
        if [ -d "node_modules_flat/.pnpm" ]; then \
          found=$(find node_modules_flat/.pnpm -type d -name "$mod" 2>/dev/null | head -1); \
          if [ -n "$found" ]; then \
            echo "  Found in .pnpm: $found, creating symlink..." && \
            mkdir -p "node_modules_flat/$(dirname "$mod")" 2>/dev/null || true; \
            cp -r "$found" "node_modules_flat/$mod" 2>/dev/null || true; \
            if [ -d "node_modules_flat/$mod" ]; then \
              echo "  ✓ $mod copied from .pnpm"; \
              continue; \
            fi; \
          fi; \
        fi && \
        MISSING="$MISSING $mod"; \
      else \
        echo "✓ $mod module found"; \
      fi; \
    done && \
    if [ -n "$MISSING" ]; then \
      echo "Missing modules:$MISSING" && \
      echo "Searching for styled-jsx in .pnpm..." && \
      find node_modules_flat/.pnpm -type d -name "*styled-jsx*" 2>/dev/null | head -5 || echo "Not found in .pnpm" && \
      echo "Available top-level modules:" && \
      ls -1 node_modules_flat/ | head -30 && \
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

