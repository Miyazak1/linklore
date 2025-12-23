# 最终修复迁移问题

## 当前问题

1. **权限错误**：`linklore_user` 不是 schema 的所有者
2. **失败的迁移记录**：数据库中仍有失败的迁移记录

---

## 解决方案：使用 postgres 用户重置

### 方法 1：使用 postgres 用户删除迁移表（推荐）

```bash
cd /www/wwwroot/www.linkloredu.com

# 使用 postgres 用户删除迁移表
sudo -u postgres psql -d linklore -c "DROP TABLE IF EXISTS _prisma_migrations;"

# 重新运行迁移
pnpm prisma:migrate
```

### 方法 2：标记失败的迁移为已回滚

```bash
cd /www/wwwroot/www.linkloredu.com

# 标记失败的迁移为已回滚
cd apps/web
npx prisma migrate resolve --rolled-back 20250121000000_add_topic_subtitle --schema=../../prisma/schema.prisma

# 回到根目录，重新运行迁移
cd ../..
pnpm prisma:migrate
```

### 方法 3：使用 postgres 用户完全重置数据库

```bash
cd /www/wwwroot/www.linkloredu.com

# 使用 postgres 用户重置
sudo -u postgres psql -d linklore << 'EOF'
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

执行以下命令：

```bash
cd /www/wwwroot/www.linkloredu.com && \
echo "🗑️ 使用 postgres 用户删除迁移表..." && \
sudo -u postgres psql -d linklore -c "DROP TABLE IF EXISTS _prisma_migrations;" && \
echo "✅ 迁移历史已清除" && \
echo "" && \
echo "🔄 重新运行迁移..." && \
pnpm prisma:migrate && \
echo "" && \
echo "✅ 迁移完成！"
```

---

## 如果方法 1 不行，使用方法 2

```bash
cd /www/wwwroot/www.linkloredu.com && \
echo "⏭️ 标记失败的迁移为已回滚..." && \
cd apps/web && \
npx prisma migrate resolve --rolled-back 20250121000000_add_topic_subtitle --schema=../../prisma/schema.prisma && \
cd ../.. && \
echo "✅ 失败的迁移已标记为已回滚" && \
echo "" && \
echo "🔄 重新运行迁移..." && \
pnpm prisma:migrate && \
echo "" && \
echo "✅ 迁移完成！"
```

---

## 如果还是不行，完全重置（使用 postgres 用户）

```bash
cd /www/wwwroot/www.linkloredu.com && \
echo "🗑️ 使用 postgres 用户完全重置数据库..." && \
sudo -u postgres psql -d linklore << 'EOF'
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

## 重要提示

1. **使用 postgres 用户**：删除 schema 需要 postgres 用户权限
2. **删除迁移表**：会清除所有迁移记录，需要重新运行所有迁移
3. **数据库是空的**：如果是新数据库，可以安全地重置

---

## 验证

清理后，检查迁移表是否已删除：

```bash
# 检查迁移表是否存在
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore -c "\dt _prisma_migrations"
```

如果表不存在，说明已成功删除。

---

## 下一步

先执行方法 1（使用 postgres 用户删除迁移表）。如果还不行，再执行方法 2 或方法 3。















