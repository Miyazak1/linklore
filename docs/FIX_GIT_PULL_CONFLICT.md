# 解决 Git Pull 冲突

## 当前问题

Git pull 失败，因为：
1. `ecosystem.config.js` 有本地修改
2. `prisma/migrations/manual_add_user_avatar.sql` 是未跟踪文件，会被覆盖

---

## 解决方案

### 方案 1：保留本地修改并拉取代码（推荐）

```bash
cd /www/wwwroot/linklore

# 1. 查看 ecosystem.config.js 的本地修改
git diff ecosystem.config.js

# 2. 如果修改不重要，直接覆盖
git checkout -- ecosystem.config.js

# 3. 删除未跟踪的文件（如果不需要保留）
rm prisma/migrations/manual_add_user_avatar.sql

# 4. 拉取最新代码
git pull origin master

# 5. 重启服务
pm2 restart linklore-web
```

### 方案 2：暂存本地修改后拉取

```bash
cd /www/wwwroot/linklore

# 1. 暂存本地修改
git stash

# 2. 删除未跟踪的文件
rm prisma/migrations/manual_add_user_avatar.sql

# 3. 拉取最新代码
git pull origin master

# 4. 如果需要恢复本地修改（通常不需要）
# git stash pop

# 5. 重启服务
pm2 restart linklore-web
```

### 方案 3：强制覆盖（最简单，但会丢失本地修改）

⚠️ **警告**：这会丢失 `ecosystem.config.js` 的本地修改！

```bash
cd /www/wwwroot/linklore

# 1. 强制覆盖所有本地修改
git reset --hard origin/master

# 2. 删除未跟踪的文件
rm -f prisma/migrations/manual_add_user_avatar.sql

# 3. 拉取最新代码（现在应该可以了）
git pull origin master

# 4. 重启服务
pm2 restart linklore-web
```

---

## 推荐操作（一键执行）

```bash
cd /www/wwwroot/linklore && \
echo "==========================================" && \
echo "解决 Git 冲突并拉取最新代码" && \
echo "==========================================" && \
echo "" && \
echo "[1/4] 查看本地修改..." && \
git diff ecosystem.config.js | head -20 && \
echo "" && \
echo "[2/4] 覆盖本地修改（保留远程版本）..." && \
git checkout -- ecosystem.config.js && \
echo "✓ ecosystem.config.js 已覆盖" && \
echo "" && \
echo "[3/4] 删除未跟踪的文件..." && \
rm -f prisma/migrations/manual_add_user_avatar.sql && \
echo "✓ 未跟踪文件已删除" && \
echo "" && \
echo "[4/4] 拉取最新代码..." && \
git pull origin master && \
echo "✓ 代码已更新" && \
echo "" && \
echo "[5/5] 重启服务..." && \
pm2 restart linklore-web && \
echo "✓ 服务已重启" && \
echo "" && \
echo "==========================================" && \
echo "完成！" && \
echo "=========================================="
```

---

## 如果 ecosystem.config.js 的修改很重要

如果服务器上的 `ecosystem.config.js` 有重要修改（比如 worker 路径配置），需要保留：

```bash
cd /www/wwwroot/linklore

# 1. 备份本地修改
cp ecosystem.config.js ecosystem.config.js.backup

# 2. 拉取代码（先解决冲突）
git checkout -- ecosystem.config.js
rm -f prisma/migrations/manual_add_user_avatar.sql
git pull origin master

# 3. 查看差异，手动合并
diff ecosystem.config.js.backup ecosystem.config.js

# 4. 如果需要，手动编辑 ecosystem.config.js 合并修改
# nano ecosystem.config.js

# 5. 重启服务
pm2 restart linklore-web
```

---

## 验证

拉取成功后，检查：

```bash
cd /www/wwwroot/linklore

# 检查 Git 状态
git status

# 应该显示 "Your branch is up to date with 'origin/master'"

# 检查服务状态
pm2 status

# 所有服务应该是 online
```

---

**完成！现在可以正常拉取代码了！**




