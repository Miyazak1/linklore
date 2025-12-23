# 重新克隆仓库

## ⚠️ 重要提示

重新克隆会**覆盖现有代码**，但不会删除：
- `.env.production` 等环境变量文件（如果不在 Git 中）
- `node_modules`（需要重新安装）
- `logs/` 目录（会保留）

---

## 步骤

### 1. 备份重要配置文件

```bash
cd /www/wwwroot/linklore

# 备份环境变量文件
cp apps/web/.env.production apps/web/.env.production.backup

# 备份 ecosystem.config.js（如果有本地修改）
cp ecosystem.config.js ecosystem.config.js.backup

# 查看备份
ls -la apps/web/.env.production.backup
ls -la ecosystem.config.js.backup
```

### 2. 停止服务

```bash
pm2 stop all
```

### 3. 备份或删除现有代码

```bash
cd /www/wwwroot

# 重命名现有目录（备份）
mv linklore linklore.backup.$(date +%Y%m%d_%H%M%S)

# 或者直接删除（如果确定不需要）
# rm -rf linklore
```

### 4. 重新克隆仓库

```bash
cd /www/wwwroot

# 克隆仓库
git clone https://github.com/Miyazak1/linklore.git

# 进入目录
cd linklore
```

### 5. 恢复配置文件

```bash
cd /www/wwwroot/linklore

# 恢复环境变量文件
cp ../linklore.backup.*/apps/web/.env.production apps/web/.env.production

# 恢复 ecosystem.config.js（如果需要）
# cp ../linklore.backup.*/ecosystem.config.js ecosystem.config.js

# 验证文件已恢复
cat apps/web/.env.production | head -5
```

### 6. 安装依赖并构建

```bash
cd /www/wwwroot/linklore

# 安装依赖
pnpm install --frozen-lockfile

# 生成 Prisma Client
pnpm prisma:generate

# 构建项目
pnpm build
```

### 7. 启动服务

```bash
cd /www/wwwroot/linklore

# 启动所有服务
pm2 start ecosystem.config.js

# 检查状态
pm2 status
```

---

## 一键执行脚本

```bash
cd /www/wwwroot && \
echo "==========================================" && \
echo "重新克隆仓库" && \
echo "==========================================" && \
echo "" && \
echo "[1/7] 停止服务..." && \
pm2 stop all && \
echo "✓ 服务已停止" && \
echo "" && \
echo "[2/7] 备份现有代码..." && \
if [ -d "linklore" ]; then \
  mv linklore linklore.backup.$(date +%Y%m%d_%H%M%S) && \
  echo "✓ 代码已备份" && \
  BACKUP_DIR=$(ls -td linklore.backup.* | head -1); \
else \
  echo "✗ linklore 目录不存在"; \
fi && \
echo "" && \
echo "[3/7] 克隆仓库..." && \
git clone https://github.com/Miyazak1/linklore.git && \
echo "✓ 仓库已克隆" && \
echo "" && \
echo "[4/7] 恢复配置文件..." && \
if [ -n "$BACKUP_DIR" ] && [ -f "$BACKUP_DIR/apps/web/.env.production" ]; then \
  cp "$BACKUP_DIR/apps/web/.env.production" linklore/apps/web/.env.production && \
  echo "✓ 环境变量已恢复"; \
else \
  echo "⚠ 未找到备份的环境变量文件，需要手动配置"; \
fi && \
echo "" && \
echo "[5/7] 安装依赖..." && \
cd linklore && \
pnpm install --frozen-lockfile && \
echo "✓ 依赖已安装" && \
echo "" && \
echo "[6/7] 生成 Prisma Client 并构建..." && \
pnpm prisma:generate && \
pnpm build && \
echo "✓ 构建完成" && \
echo "" && \
echo "[7/7] 启动服务..." && \
pm2 start ecosystem.config.js && \
pm2 status && \
echo "" && \
echo "==========================================" && \
echo "完成！" && \
echo "==========================================" && \
echo "" && \
echo "重要提示：" && \
echo "1. 检查 apps/web/.env.production 是否正确" && \
echo "2. 检查 ecosystem.config.js 配置是否正确" && \
echo "3. 测试登录功能"
```

---

## 验证

### 1. 检查服务状态

```bash
pm2 status
```

所有服务应该是 `online`

### 2. 检查日志

```bash
pm2 logs linklore-web --lines 20
```

### 3. 测试登录

1. 访问：`http://www.mooyu.fun/signin`
2. 登录
3. 查看错误日志：

```bash
tail -50 /www/wwwroot/linklore/logs/web-error.log
```

应该看到调试日志。

---

## 如果遇到问题

### 问题 1：环境变量丢失

从备份恢复：

```bash
cp /www/wwwroot/linklore.backup.*/apps/web/.env.production /www/wwwroot/linklore/apps/web/.env.production
```

### 问题 2：依赖安装失败

```bash
cd /www/wwwroot/linklore

# 清除缓存
pnpm store prune

# 重新安装
pnpm install --frozen-lockfile
```

### 问题 3：构建失败

检查错误信息：

```bash
pnpm build 2>&1 | tail -50
```

---

**完成！现在代码应该是最新的了！**




