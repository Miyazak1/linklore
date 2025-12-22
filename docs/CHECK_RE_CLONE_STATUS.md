# 检查重新克隆状态

## 如果脚本卡住了

### 1. 检查当前进程

在**另一个终端**执行：

```bash
# 检查是否有构建进程在运行
ps aux | grep -E "pnpm|node|next" | grep -v grep

# 检查磁盘空间
df -h

# 检查内存使用
free -h
```

### 2. 检查构建是否完成

```bash
cd /www/wwwroot/linklore

# 检查是否有 .next 目录
ls -la .next/ 2>/dev/null || echo "构建未完成"

# 检查构建时间
ls -lt .next/ 2>/dev/null | head -5
```

### 3. 如果卡在构建，可以中断并手动继续

按 `Ctrl + C` 中断当前脚本，然后手动执行：

```bash
cd /www/wwwroot/linklore

# 检查当前状态
pwd
ls -la

# 如果依赖已安装，继续构建
if [ -d "node_modules" ]; then
  echo "依赖已安装，继续构建..."
  pnpm prisma:generate
  pnpm build
else
  echo "依赖未安装，先安装依赖..."
  pnpm install --frozen-lockfile
  pnpm prisma:generate
  pnpm build
fi

# 启动服务
pm2 start ecosystem.config.js
pm2 status
```

### 4. 检查服务状态

```bash
pm2 status

# 如果服务没有启动，手动启动
pm2 start ecosystem.config.js

# 查看日志
pm2 logs linklore-web --lines 20
```

---

## 快速检查清单

```bash
cd /www/wwwroot/linklore && \
echo "==========================================" && \
echo "检查重新克隆状态" && \
echo "==========================================" && \
echo "" && \
echo "[1] 检查目录是否存在..." && \
ls -la | head -5 && \
echo "" && \
echo "[2] 检查依赖是否安装..." && \
if [ -d "node_modules" ]; then \
  echo "✓ node_modules 存在"; \
else \
  echo "✗ node_modules 不存在，需要安装依赖"; \
fi && \
echo "" && \
echo "[3] 检查构建是否完成..." && \
if [ -d ".next" ]; then \
  echo "✓ .next 目录存在，构建可能已完成"; \
else \
  echo "✗ .next 目录不存在，需要构建"; \
fi && \
echo "" && \
echo "[4] 检查环境变量..." && \
if [ -f "apps/web/.env.production" ]; then \
  echo "✓ .env.production 存在"; \
  cat apps/web/.env.production | grep -E "COOKIE_SECURE|SESSION_SECRET" | head -2; \
else \
  echo "✗ .env.production 不存在，需要配置"; \
fi && \
echo "" && \
echo "[5] 检查服务状态..." && \
pm2 status && \
echo "" && \
echo "=========================================="
```

---

## 如果构建卡住了

可能是内存不足或构建时间较长。可以：

### 方案 1：增加交换空间

```bash
# 检查交换空间
free -h

# 如果交换空间不足，可以增加（需要 root 权限）
# 注意：这需要一些时间
```

### 方案 2：分步执行

```bash
cd /www/wwwroot/linklore

# 只构建 web 应用（如果 monorepo 支持）
cd apps/web
pnpm build

# 或者使用更少的并发
NODE_OPTIONS="--max-old-space-size=2048" pnpm build
```

---

## 如果服务启动失败

检查错误：

```bash
pm2 logs linklore-web --lines 50 --err

# 或者查看错误日志文件
tail -50 /www/wwwroot/linklore/logs/web-error.log
```

---

**请先执行快速检查清单，告诉我看到了什么！**

