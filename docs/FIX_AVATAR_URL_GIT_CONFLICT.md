# 修复 avatarUrl 字段（解决 Git 冲突）

## 当前问题

服务器上的 `ecosystem.config.js` 有本地修改，导致 `git pull` 失败。

---

## 解决方案

### 方案 1：直接修复（推荐，不需要拉取代码）

直接在数据库执行 SQL，不需要拉取代码：

```bash
cd /www/wwwroot/linklore && \
echo "==========================================" && \
echo "修复 avatarUrl 字段（直接执行）" && \
echo "==========================================" && \
echo "" && \
echo "[1/2] 在数据库中添加字段..." && \
psql $DATABASE_URL -c "ALTER TABLE \"User\" ADD COLUMN IF NOT EXISTS \"avatarUrl\" TEXT;" && \
echo "✓ 字段已添加" && \
echo "" && \
echo "[2/2] 重新生成 Prisma Client 并重启服务..." && \
pnpm prisma:generate && \
pm2 restart linklore-web && \
echo "✓ 完成！" && \
echo "" && \
echo "现在可以测试注册功能了！"
```

---

### 方案 2：处理 Git 冲突后拉取代码

#### 步骤 1：查看本地修改

```bash
cd /www/wwwroot/linklore

# 查看 ecosystem.config.js 的修改
git diff ecosystem.config.js
```

#### 步骤 2：保存本地修改（如果需要保留）

```bash
# 备份本地修改
cp ecosystem.config.js ecosystem.config.js.backup

# 暂存本地修改
git stash

# 拉取最新代码
git pull origin master

# 查看是否有冲突
git status
```

#### 步骤 3：恢复或应用修改

**如果不需要保留本地修改**（推荐）：
```bash
# 直接使用远程版本
git checkout -- ecosystem.config.js
```

**如果需要保留本地修改**：
```bash
# 恢复本地修改
git stash pop

# 如果有冲突，手动解决后
git add ecosystem.config.js
git commit -m "chore: 保留服务器配置"
```

#### 步骤 4：执行修复

```bash
# 执行 SQL 修复
pnpm prisma db execute --file prisma/migrations/manual_add_user_avatar.sql --schema prisma/schema.prisma && \
pnpm prisma:generate && \
pm2 restart linklore-web
```

---

### 方案 3：强制覆盖本地修改（如果确定不需要保留）

⚠️ **警告**：这会丢失服务器上的本地修改！

```bash
cd /www/wwwroot/linklore

# 强制覆盖本地修改
git checkout -- ecosystem.config.js

# 拉取最新代码
git pull origin master

# 执行修复
pnpm prisma db execute --file prisma/migrations/manual_add_user_avatar.sql --schema prisma/schema.prisma && \
pnpm prisma:generate && \
pm2 restart linklore-web
```

---

## 推荐操作

**直接使用方案 1**，因为：
- ✅ 不需要处理 Git 冲突
- ✅ 不需要拉取代码
- ✅ 一步完成修复
- ✅ 不影响现有配置

---

## 验证

1. 执行方案 1 的命令
2. 访问：`https://www.mooyu.fun/signup`
3. 填写注册表单并提交
4. **预期结果**：注册成功，不再出现 `avatarUrl` 字段缺失错误

---

**完成！**




