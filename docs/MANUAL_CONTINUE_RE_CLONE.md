# 手动继续重新克隆

## 如果脚本卡住了

### 1. 中断当前脚本

按 `Ctrl + C` 中断当前脚本。

### 2. 检查当前状态

```bash
cd /www/wwwroot

# 检查目录
ls -la | grep linklore

# 检查是否有构建进程
ps aux | grep -E "pnpm|node.*build|next" | grep -v grep
```

### 3. 手动继续执行

```bash
cd /www/wwwroot/linklore

# 检查当前状态
echo "当前目录: $(pwd)"
echo "目录内容:"
ls -la | head -10

# 如果依赖未安装，先安装
if [ ! -d "node_modules" ]; then
  echo "安装依赖..."
  pnpm install --frozen-lockfile
fi

# 生成 Prisma Client
echo "生成 Prisma Client..."
pnpm prisma:generate

# 构建项目（可能需要一些时间）
echo "构建项目..."
pnpm build

# 启动服务
echo "启动服务..."
pm2 start ecosystem.config.js

# 检查状态
pm2 status
```

### 4. 如果构建很慢或卡住

可能是内存不足。可以：

```bash
cd /www/wwwroot/linklore

# 使用更少的内存构建
NODE_OPTIONS="--max-old-space-size=2048" pnpm build

# 或者只构建 web 应用
cd apps/web
pnpm build
```

### 5. 检查构建是否成功

```bash
cd /www/wwwroot/linklore

# 检查 .next 目录
if [ -d ".next" ] || [ -d "apps/web/.next" ]; then
  echo "✓ 构建成功"
  ls -la .next/ 2>/dev/null || ls -la apps/web/.next/ 2>/dev/null | head -5
else
  echo "✗ 构建未完成或失败"
fi
```

---

## 快速恢复脚本

如果脚本中断了，可以用这个快速恢复：

```bash
cd /www/wwwroot/linklore && \
echo "==========================================" && \
echo "手动继续重新克隆" && \
echo "==========================================" && \
echo "" && \
echo "[1/4] 检查状态..." && \
echo "当前目录: $(pwd)" && \
if [ -d "node_modules" ]; then \
  echo "✓ 依赖已安装"; \
else \
  echo "✗ 依赖未安装，开始安装..."; \
  pnpm install --frozen-lockfile && \
  echo "✓ 依赖安装完成"; \
fi && \
echo "" && \
echo "[2/4] 生成 Prisma Client..." && \
pnpm prisma:generate && \
echo "✓ Prisma Client 已生成" && \
echo "" && \
echo "[3/4] 构建项目..." && \
pnpm build && \
echo "✓ 构建完成" && \
echo "" && \
echo "[4/4] 启动服务..." && \
pm2 start ecosystem.config.js && \
pm2 status && \
echo "" && \
echo "==========================================" && \
echo "完成！" && \
echo "=========================================="
```

---

## 如果仍然卡住

### 检查资源使用

```bash
# 检查内存
free -h

# 检查磁盘空间
df -h

# 检查 CPU
top -bn1 | head -20
```

### 如果内存不足

可以增加交换空间，或者分步构建：

```bash
cd /www/wwwroot/linklore

# 只构建必要的部分
cd apps/web
pnpm build
```

---

**请先中断脚本（Ctrl+C），然后执行快速恢复脚本！**

