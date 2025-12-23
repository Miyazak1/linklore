# 跳过每日议题相关迁移的步骤

## 问题
`add_daily_issue_relations` 迁移试图修改 `IssuePath` 和 `IssueFeedback` 表，但这些表还没有被创建。

## 解决方案：跳过这些迁移

在宝塔面板终端执行以下命令：

```bash
cd /www/wwwroot/linklore

# 1. 连接到数据库
PGPASSWORD='a8rEczHFnMGm' psql -U linklore_user -h localhost -d linklore

# 2. 在 psql 中执行以下 SQL，标记这些迁移为已应用（跳过）
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES 
  ('skip-daily-issue-1', '', NOW(), '20240101000003_add_daily_issue_relations', NULL, NULL, NOW(), 1),
  ('skip-daily-issue-2', '', NOW(), '20250121120000_add_daily_issue_relations', NULL, NULL, NOW(), 1),
  ('skip-daily-issue-3', '', NOW(), '20251220141952_add_daily_issue_relations', NULL, NULL, NOW(), 1)
ON CONFLICT DO NOTHING;

# 3. 退出 psql
\q

# 4. 继续执行迁移
pnpm prisma:migrate
```

## 说明
这些迁移是添加每日议题功能的用户关联，暂时不需要，所以可以跳过。





