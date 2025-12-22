# 在服务器上修复 avatarUrl 字段（快速方案）

## 问题

服务器上找不到 `prisma/migrations/manual_add_user_avatar.sql` 文件。

---

## 解决方案

### 方案 1：拉取最新代码（推荐）

```bash
cd /www/wwwroot/linklore

# 拉取最新代码
git pull origin master

# 然后执行修复
pnpm prisma db execute --file prisma/migrations/manual_add_user_avatar.sql --schema prisma/schema.prisma && \
pnpm prisma:generate && \
pm2 restart linklore-web
```

---

### 方案 2：直接在服务器上创建 SQL 文件（如果方案1不行）

```bash
cd /www/wwwroot/linklore

# 创建 SQL 文件
cat > prisma/migrations/manual_add_user_avatar.sql << 'EOF'
-- 手动添加 User.avatarUrl 字段
-- 如果字段已存在，会报错但可以忽略

-- 添加 avatarUrl 字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'avatarUrl'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
    END IF;
END $$;
EOF

# 执行修复
pnpm prisma db execute --file prisma/migrations/manual_add_user_avatar.sql --schema prisma/schema.prisma && \
pnpm prisma:generate && \
pm2 restart linklore-web
```

---

### 方案 3：直接在数据库执行（最简单）

在数据库管理工具中执行：

```sql
-- 添加 avatarUrl 字段
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
```

然后在服务器终端执行：

```bash
cd /www/wwwroot/linklore

# 重新生成 Prisma Client
pnpm prisma:generate

# 重启服务
pm2 restart linklore-web
```

---

## 一键执行（推荐方案3）

```bash
cd /www/wwwroot/linklore && \
echo "==========================================" && \
echo "修复 avatarUrl 字段" && \
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

## 验证

1. 访问：`https://www.mooyu.fun/signup`
2. 填写注册表单
3. 点击注册
4. **预期结果**：不再出现 `avatarUrl` 字段缺失的错误

---

**完成！**

