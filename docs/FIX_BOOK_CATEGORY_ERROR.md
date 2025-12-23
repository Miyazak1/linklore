# 修复 Book.category 字段缺失错误

## 错误信息

```
Invalid `prisma.book.findMany()` invocation: 
The column `Book.category` does not exist in the current database.
```

## 问题原因

代码中的 Prisma schema 定义了 `Book.category` 字段，但数据库中没有这个字段。这通常是因为：
1. 数据库迁移没有执行
2. 手动 SQL 文件没有执行

## 解决方案

### 方式1：执行手动 SQL 文件（推荐）

在宝塔面板终端执行：

```bash
# 1. 进入项目目录
cd /www/wwwroot/linklore

# 2. 连接数据库并执行 SQL
# 方式A：使用 psql 命令行（如果已安装）
psql $DATABASE_URL -f prisma/migrations/manual_add_book_categories.sql

# 方式B：使用 Prisma 执行（推荐）
pnpm prisma db execute --file prisma/migrations/manual_add_book_categories.sql --schema prisma/schema.prisma
```

### 方式2：直接在数据库中执行 SQL

1. 登录宝塔面板
2. 进入 **数据库** 菜单
3. 找到你的 PostgreSQL 数据库
4. 点击 **管理** 或 **phpPgAdmin**
5. 执行以下 SQL：

```sql
-- 添加分类字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Book' AND column_name = 'category'
    ) THEN
        ALTER TABLE "Book" ADD COLUMN "category" TEXT;
    END IF;
END $$;

-- 添加标签字段（数组）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Book' AND column_name = 'tags'
    ) THEN
        ALTER TABLE "Book" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
END $$;

-- 添加语言字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Book' AND column_name = 'language'
    ) THEN
        ALTER TABLE "Book" ADD COLUMN "language" TEXT;
    END IF;
END $$;

-- 添加ISBN字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Book' AND column_name = 'isbn'
    ) THEN
        ALTER TABLE "Book" ADD COLUMN "isbn" TEXT;
    END IF;
END $$;

-- 添加出版社字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Book' AND column_name = 'publisher'
    ) THEN
        ALTER TABLE "Book" ADD COLUMN "publisher" TEXT;
    END IF;
END $$;

-- 添加出版年份字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Book' AND column_name = 'publishYear'
    ) THEN
        ALTER TABLE "Book" ADD COLUMN "publishYear" INTEGER;
    END IF;
END $$;

-- 添加索引
CREATE INDEX IF NOT EXISTS "Book_category_idx" ON "Book"("category");
CREATE INDEX IF NOT EXISTS "Book_language_idx" ON "Book"("language");
CREATE INDEX IF NOT EXISTS "Book_publishYear_idx" ON "Book"("publishYear");
```

### 方式3：使用 Prisma Migrate（如果迁移文件存在）

```bash
cd /www/wwwroot/linklore

# 检查迁移状态
pnpm prisma migrate status

# 应用所有待执行的迁移
pnpm prisma migrate deploy
```

## 验证修复

执行 SQL 后，验证字段是否已添加：

```bash
# 方式1：使用 Prisma Studio（如果有）
pnpm prisma studio

# 方式2：使用 psql 查询
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'Book' AND column_name = 'category';"

# 应该返回：category
```

## 重新构建

修复数据库后，重新构建项目：

```bash
cd /www/wwwroot/linklore

# 重新生成 Prisma Client
pnpm prisma:generate

# 重新构建
pnpm build

# 重启服务
pm2 restart ecosystem.config.js
```

## 完整修复流程（一键执行）

```bash
cd /www/wwwroot/linklore

# 1. 执行 SQL 文件
pnpm prisma db execute --file prisma/migrations/manual_add_book_categories.sql --schema prisma/schema.prisma

# 2. 重新生成 Prisma Client
pnpm prisma:generate

# 3. 重新构建
pnpm build

# 4. 重启服务
pm2 restart ecosystem.config.js

# 5. 查看状态
pm2 status
pm2 logs --lines 20
```

## 如果仍然失败

如果执行 SQL 后仍然报错，检查：

1. **确认字段已添加**：
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'Book';
   ```

2. **检查 Prisma Client 是否更新**：
   ```bash
   # 删除旧的 Prisma Client
   rm -rf node_modules/.prisma
   rm -rf apps/web/node_modules/.prisma
   
   # 重新生成
   pnpm prisma:generate
   ```

3. **检查环境变量**：
   确保 `DATABASE_URL` 指向正确的数据库

---

**完成！修复后重新构建项目即可。**




