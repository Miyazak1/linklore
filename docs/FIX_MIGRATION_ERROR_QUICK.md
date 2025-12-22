# 快速修复迁移错误

## 错误
```
Error: P3018
relation "IssuePath" does not exist
```

## 快速解决方案

### 步骤 1：解决迁移错误

在宝塔面板终端执行：

```bash
cd /www/wwwroot/linklore

# 标记失败的迁移为已应用（跳过执行）
pnpm prisma migrate resolve --applied 20250121120000_add_daily_issue_relations
```

### 步骤 2：手动创建缺失的表

```bash
# 执行修复后的 SQL 文件
pnpm prisma db execute --file prisma/migrations/20250121120000_add_daily_issue_relations/migration_fixed.sql --schema prisma/schema.prisma
```

或者直接在数据库管理工具中执行 `migration_fixed.sql` 的内容。

### 步骤 3：继续迁移

```bash
# 继续运行其他迁移
pnpm prisma migrate deploy
```

### 步骤 4：生成 Prisma Client 并构建

```bash
# 生成 Prisma Client
pnpm prisma:generate

# 构建项目
pnpm build

# 重启服务
pm2 restart ecosystem.config.js
```

---

## 如果上面的方法不行

### 完全重置数据库

```bash
cd /www/wwwroot/linklore

# 1. 停止服务
pm2 stop all

# 2. 手动清空数据库（在数据库管理工具中）
# 执行：DROP SCHEMA public CASCADE; CREATE SCHEMA public;

# 3. 删除迁移记录表
psql $DATABASE_URL -c "DROP TABLE IF EXISTS \"_prisma_migrations\";"

# 4. 重新运行迁移
pnpm prisma migrate deploy

# 5. 执行手动 SQL
pnpm prisma db execute --file prisma/migrations/manual_add_book_categories.sql --schema prisma/schema.prisma
pnpm prisma db execute --file prisma/migrations/manual_add_baike_game_models.sql --schema prisma/schema.prisma
pnpm prisma db execute --file prisma/migrations/manual_add_chat_models.sql --schema prisma/schema.prisma

# 6. 生成和构建
pnpm prisma:generate
pnpm build

# 7. 重启服务
pm2 restart ecosystem.config.js
```

---

**完成！**

