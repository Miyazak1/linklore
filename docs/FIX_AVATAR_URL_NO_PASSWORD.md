# 修复 avatarUrl 字段（无需输入密码）

## 问题

使用 `psql` 命令时需要输入数据库密码，不方便。

---

## 解决方案

### 方案 1：使用 Prisma 执行 SQL（推荐）

Prisma 会使用 `.env.production` 中的 `DATABASE_URL`，无需手动输入密码：

```bash
cd /www/wwwroot/linklore && \
echo "==========================================" && \
echo "修复 avatarUrl 字段" && \
echo "==========================================" && \
echo "" && \
echo "[1/3] 创建 SQL 文件（如果不存在）..." && \
mkdir -p prisma/migrations && \
cat > prisma/migrations/manual_add_user_avatar.sql << 'EOF'
-- 手动添加 User.avatarUrl 字段
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
echo "✓ SQL 文件已创建" && \
echo "" && \
echo "[2/3] 执行 SQL 添加字段..." && \
pnpm prisma db execute --file prisma/migrations/manual_add_user_avatar.sql --schema prisma/schema.prisma && \
echo "✓ 字段已添加" && \
echo "" && \
echo "[3/3] 重新生成 Prisma Client 并重启服务..." && \
pnpm prisma:generate && \
pm2 restart linklore-web && \
echo "✓ 完成！" && \
echo "" && \
echo "现在可以测试注册功能了！"
```

---

### 方案 2：在数据库管理工具中执行（最简单）

在宝塔面板的数据库管理工具中：

1. 打开 **数据库** → 找到你的数据库 → 点击 **管理**
2. 在 SQL 执行界面输入：

```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
```

3. 点击 **执行**

然后在终端执行：

```bash
cd /www/wwwroot/linklore && \
pnpm prisma:generate && \
pm2 restart linklore-web
```

---

### 方案 3：使用 .pgpass 文件（如果必须用 psql）

创建密码文件（一次性设置）：

```bash
# 查看 DATABASE_URL 中的信息
cd /www/wwwroot/linklore
cat apps/web/.env.production | grep DATABASE_URL

# 从 DATABASE_URL 中提取信息，格式：hostname:port:database:username:password
# 例如：localhost:5432:linklore:root:your_password

# 创建 .pgpass 文件
echo "localhost:5432:linklore:root:your_password" > ~/.pgpass
chmod 600 ~/.pgpass

# 然后执行 SQL
psql $DATABASE_URL -c "ALTER TABLE \"User\" ADD COLUMN IF NOT EXISTS \"avatarUrl\" TEXT;"
```

---

## 推荐操作

**使用方案 1**（Prisma 执行 SQL），因为：
- ✅ 使用项目配置的数据库连接（`.env.production`）
- ✅ 无需手动输入密码
- ✅ 自动处理连接信息

**或者使用方案 2**（数据库管理工具），因为：
- ✅ 最简单直观
- ✅ 可以在图形界面中操作
- ✅ 无需命令行

---

## 验证

1. 执行上述任一方案
2. 访问：`https://www.mooyu.fun/signup`
3. 填写注册表单并提交
4. **预期结果**：注册成功，不再出现 `avatarUrl` 字段缺失错误

---

**完成！**

