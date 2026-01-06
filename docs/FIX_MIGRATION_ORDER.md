# 修复迁移顺序问题

## 当前错误

```
Error: relation "Topic" does not exist
```

**原因**：迁移文件 `20250121000000_add_topic_subtitle` 试图修改 `Topic` 表，但该表是在 `20251112133920_init` 中创建的。由于时间戳，`20250121000000` 会在 `20251112133920` 之前执行。

---

## 解决方案

### 方案 1：重置数据库并重新运行所有迁移（推荐）

```bash
# 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 重置数据库（删除所有表）
npx prisma migrate reset --force --schema=../../prisma/schema.prisma

# 重新运行所有迁移
pnpm prisma:migrate
```

**注意**：这会删除数据库中的所有数据！如果数据库中有重要数据，不要使用这个方法。

### 方案 2：标记失败的迁移为已应用，然后继续

```bash
# 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 标记失败的迁移为已应用（跳过它）
npx prisma migrate resolve --applied 20250121000000_add_topic_subtitle --schema=../../prisma/schema.prisma

# 继续运行迁移
pnpm prisma:migrate
```

### 方案 3：手动修复迁移顺序（如果数据库是空的）

如果数据库是空的，可以删除迁移历史并重新创建：

```bash
# 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 删除迁移历史表
psql -h 127.0.0.1 -U linklore_user -d linklore -c "DROP TABLE IF EXISTS _prisma_migrations;"

# 重新运行所有迁移
pnpm prisma:migrate
```

---

## 推荐操作（数据库是空的）

如果数据库是空的（没有重要数据），使用方案 1：

```bash
cd /www/wwwroot/www.linkloredu.com && \
echo "🔄 重置数据库并重新运行迁移..." && \
npx prisma migrate reset --force --schema=../../prisma/schema.prisma && \
echo "" && \
echo "✅ 重置完成，现在运行迁移..." && \
pnpm prisma:migrate && \
echo "" && \
echo "✅ 迁移完成！"
```

---

## 如果数据库有数据（不推荐重置）

使用方案 2，跳过失败的迁移：

```bash
cd /www/wwwroot/www.linkloredu.com && \
echo "⏭️ 标记失败的迁移为已应用..." && \
npx prisma migrate resolve --applied 20250121000000_add_topic_subtitle --schema=../../prisma/schema.prisma && \
echo "" && \
echo "🔄 继续运行迁移..." && \
pnpm prisma:migrate && \
echo "" && \
echo "✅ 迁移完成！"
```

---

## 检查迁移状态

```bash
# 查看迁移状态
npx prisma migrate status --schema=../../prisma/schema.prisma
```

---

## 重要提示

1. **重置会删除数据**：`migrate reset` 会删除所有表和数据
2. **如果是新数据库**：可以安全地重置
3. **如果有数据**：使用方案 2，跳过失败的迁移

---

## 下一步

根据你的情况选择：

- **数据库是空的**：使用方案 1（重置并重新运行）
- **数据库有数据**：使用方案 2（跳过失败的迁移）

完成后告诉我结果。





















