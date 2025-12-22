# 修复 User.avatarUrl 字段缺失错误

## 错误信息

```
Invalid `prisma.user.findUnique()` invocation: 
The column `User.avatarUrl` does not exist in the current database.
```

## 问题原因

Prisma schema 中定义了 `avatarUrl` 字段，但数据库表中缺少该字段，导致查询失败。

---

## 解决方案

### 方法 1：使用 SQL 脚本（推荐）

#### 步骤 1：执行 SQL 添加字段

在宝塔面板终端执行：

```bash
cd /www/wwwroot/linklore

# 执行 SQL 添加字段
pnpm prisma db execute --file prisma/migrations/manual_add_user_avatar.sql --schema prisma/schema.prisma
```

或者直接在数据库管理工具中执行：

```sql
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
```

#### 步骤 2：重新生成 Prisma Client

```bash
cd /www/wwwroot/linklore

# 重新生成 Prisma Client
pnpm prisma:generate
```

#### 步骤 3：重启服务

```bash
pm2 restart linklore-web
```

---

### 方法 2：使用 Prisma Migrate（如果方法1不行）

```bash
cd /www/wwwroot/linklore

# 创建迁移
pnpm prisma migrate dev --name add_user_avatar_url --create-only

# 编辑生成的迁移文件，确保只添加 avatarUrl 字段

# 应用迁移
pnpm prisma migrate deploy
```

---

### 方法 3：直接在数据库执行（最简单）

在数据库管理工具（如 pgAdmin、DBeaver 或宝塔的数据库管理）中执行：

```sql
-- 检查字段是否存在
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'avatarUrl';

-- 如果返回空，执行添加
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- 验证
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'avatarUrl';
```

然后重新生成 Prisma Client：

```bash
cd /www/wwwroot/linklore
pnpm prisma:generate
pm2 restart linklore-web
```

---

## 验证修复

### 1. 检查字段是否存在

```bash
cd /www/wwwroot/linklore

# 使用 psql 检查
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'avatarUrl';"
```

应该返回：`avatarUrl`

### 2. 测试注册功能

1. 访问：`https://www.mooyu.fun/signup`
2. 填写注册表单
3. 点击注册
4. **预期结果**：不再出现 `avatarUrl` 字段缺失的错误，注册成功

### 3. 检查日志

```bash
# 查看服务日志
pm2 logs linklore-web --lines 50
```

不应该再看到 `avatarUrl` 相关的错误。

---

## 如果仍然出错

### 检查 Prisma Client 是否更新

```bash
cd /www/wwwroot/linklore

# 强制重新生成
rm -rf node_modules/.prisma
pnpm prisma:generate
```

### 检查 schema 文件

确保 `prisma/schema.prisma` 中 User 模型包含：

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  avatarUrl String?  // 用户头像URL（可选，如果为空则使用默认头像）
  // ... 其他字段
}
```

### 完全重置数据库（最后手段）

⚠️ **警告**：这会删除所有数据！

```bash
cd /www/wwwroot/linklore

# 停止服务
pm2 stop all

# 重置数据库
pnpm prisma migrate reset --force

# 重新运行迁移
pnpm prisma migrate deploy

# 启动服务
pm2 start ecosystem.config.js
```

---

## 相关文件

- `prisma/schema.prisma` - Prisma schema 定义
- `prisma/migrations/manual_add_user_avatar.sql` - 手动添加字段的 SQL
- `docs/CREATE_ADMIN_ACCOUNT.md` - 创建管理员账号（包含修复 avatarUrl 的步骤）

---

**完成修复后，注册和登录功能应该可以正常工作了！**

