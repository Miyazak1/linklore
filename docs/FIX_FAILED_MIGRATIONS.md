# 修复失败的迁移记录

## 当前问题

错误信息显示：
- **P3018**: 迁移失败（`relation "Topic" does not exist`）
- **P3009**: 数据库中有失败的迁移记录，新迁移无法应用

**原因**：数据库中的 `_prisma_migrations` 表记录了失败的迁移，需要先清理。

---

## 解决方案

### 方案 1：删除迁移历史表，重新开始（推荐，如果数据库是空的）

```bash
# 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 删除迁移历史表
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore -c "DROP TABLE IF EXISTS _prisma_migrations;"

# 重新运行迁移
pnpm prisma:migrate
```

### 方案 2：标记失败的迁移为已回滚

```bash
cd /www/wwwroot/www.linkloredu.com

# 标记失败的迁移为已回滚
cd apps/web
npx prisma migrate resolve --rolled-back 20250121000000_add_topic_subtitle --schema=../../prisma/schema.prisma

# 回到根目录，重新运行迁移
cd ../..
pnpm prisma:migrate
```

### 方案 3：完全重置数据库（如果数据库是空的）

```bash
cd /www/wwwroot/www.linkloredu.com

# 删除所有表
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore << 'EOF'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO linklore_user;
GRANT ALL ON SCHEMA public TO public;
EOF

# 重新运行迁移
pnpm prisma:migrate
```

---

## 推荐操作（一键修复）

执行以下命令，删除迁移历史并重新开始：

```bash
cd /www/wwwroot/www.linkloredu.com && \
echo "🗑️ 删除失败的迁移记录..." && \
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore -c "DROP TABLE IF EXISTS _prisma_migrations;" && \
echo "✅ 迁移历史已清除" && \
echo "" && \
echo "🔄 重新运行迁移..." && \
pnpm prisma:migrate && \
echo "" && \
echo "✅ 迁移完成！"
```

---

## 如果方案 1 不行，使用方案 3（完全重置）

```bash
cd /www/wwwroot/www.linkloredu.com && \
echo "🗑️ 完全重置数据库..." && \
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore << 'EOF'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO linklore_user;
GRANT ALL ON SCHEMA public TO public;
EOF
echo "✅ 数据库已重置" && \
echo "" && \
echo "🔄 重新运行迁移..." && \
pnpm prisma:migrate && \
echo "" && \
echo "✅ 迁移完成！"
```

---

## 验证迁移状态

清理后，检查迁移状态：

```bash
cd /www/wwwroot/www.linkloredu.com/apps/web
npx prisma migrate status --schema=../../prisma/schema.prisma
```

---

## 重要提示

1. **删除迁移历史**：会清除所有迁移记录，需要重新运行所有迁移
2. **数据库是空的**：如果是新数据库，可以安全地删除迁移历史
3. **如果有数据**：需要先备份数据

---

## 如果还是失败

检查数据库连接和权限：

```bash
# 测试连接
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore -c "SELECT 1;"

# 检查迁移表是否存在
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore -c "\dt _prisma_migrations"
```

---

## 下一步

先执行方案 1（删除迁移历史表），然后重新运行迁移。















