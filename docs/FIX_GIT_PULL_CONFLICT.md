# 解决 Git 拉取冲突

## 问题

拉取代码时出现冲突，因为本地有两个文件有未提交的更改：
- `infrastructure/scripts/reset-db.sh`
- `infrastructure/scripts/update-bt.sh`

## 解决方案

### 方案 1：使用远程版本（推荐，如果本地更改不重要）

如果这两个脚本文件的本地更改不重要，可以直接使用远程版本：

```bash
cd /www/wwwroot/linklore

# 1. 暂存本地更改（备份）
git stash

# 2. 拉取最新代码
git pull origin master

# 3. 如果需要恢复本地更改（通常不需要）
# git stash pop
```

或者直接丢弃本地更改：

```bash
cd /www/wwwroot/linklore

# 1. 丢弃本地更改，使用远程版本
git checkout -- infrastructure/scripts/reset-db.sh
git checkout -- infrastructure/scripts/update-bt.sh

# 2. 拉取最新代码
git pull origin master
```

### 方案 2：保留本地更改并提交

如果本地更改很重要，需要先提交：

```bash
cd /www/wwwroot/linklore

# 1. 查看本地更改
git diff infrastructure/scripts/reset-db.sh
git diff infrastructure/scripts/update-bt.sh

# 2. 添加并提交更改
git add infrastructure/scripts/reset-db.sh infrastructure/scripts/update-bt.sh
git commit -m "保留本地脚本更改"

# 3. 拉取最新代码（可能会有冲突需要解决）
git pull origin master

# 4. 如果有冲突，解决冲突后：
# git add .
# git commit -m "解决冲突"
```

### 方案 3：强制使用远程版本（最简单）

如果确定要使用远程版本，可以强制重置：

```bash
cd /www/wwwroot/linklore

# 1. 备份当前更改（可选）
cp infrastructure/scripts/reset-db.sh infrastructure/scripts/reset-db.sh.backup
cp infrastructure/scripts/update-bt.sh infrastructure/scripts/update-bt.sh.backup

# 2. 强制使用远程版本
git fetch origin
git reset --hard origin/master

# 3. 清理未跟踪的文件（可选）
git clean -fd
```

---

## 推荐方案（一键执行）

如果这两个脚本文件的更改不重要，使用以下命令：

```bash
cd /www/wwwroot/linklore && \
echo "==========================================" && \
echo "解决冲突并拉取最新代码" && \
echo "==========================================" && \
echo "" && \
echo "[1/5] 丢弃本地脚本更改..." && \
git checkout -- infrastructure/scripts/reset-db.sh && \
git checkout -- infrastructure/scripts/update-bt.sh && \
echo "✓ 本地更改已丢弃" && \
echo "" && \
echo "[2/5] 拉取最新代码..." && \
git pull origin master && \
echo "✓ 代码已更新" && \
echo "" && \
echo "[3/5] 安装依赖..." && \
pnpm install && \
echo "✓ 依赖已安装" && \
echo "" && \
echo "[4/5] 构建项目..." && \
pnpm build && \
echo "✓ 构建完成" && \
echo "" && \
echo "[5/5] 重启服务..." && \
pm2 restart linklore-web && \
echo "✓ 服务已重启" && \
echo "" && \
echo "==========================================" && \
echo "完成！" && \
echo "==========================================" && \
pm2 status
```

---

## 验证

拉取成功后，检查：

```bash
# 查看最新提交
git log -1

# 查看状态
git status

# 查看服务状态
pm2 status
```
