# 修复每日议题迁移问题

## 问题分析
`add_daily_issue_relations` 迁移试图修改 `IssuePath` 和 `IssueFeedback` 表，但这些表还没有被创建。

## 解决方案

### 步骤 1：检查服务器上的迁移文件名

在宝塔面板终端执行：

```bash
cd /www/wwwroot/linklore
ls -la prisma/migrations/ | grep daily_issue
```

### 步骤 2：跳过有问题的迁移

```bash
# 连接到数据库
PGPASSWORD='a8rEczHFnMGm' psql -U linklore_user -h localhost -d linklore << 'EOF'

-- 查看所有包含 daily_issue 的迁移记录
SELECT migration_name, finished_at FROM "_prisma_migrations" 
WHERE migration_name LIKE '%daily_issue%';

-- 标记这些迁移为已应用（跳过）
-- 注意：根据步骤1的结果，替换下面的迁移名称
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
SELECT 
  'skip-' || migration_name,
  '',
  NOW(),
  migration_name,
  NULL,
  NULL,
  NOW(),
  1
FROM (
  SELECT DISTINCT migration_name 
  FROM (
    VALUES 
      ('20240101000003_add_daily_issue_relations'),
      ('20250121120000_add_daily_issue_relations'),
      ('20251220141952_add_daily_issue_relations')
  ) AS t(migration_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" m2 
    WHERE m2.migration_name = t.migration_name AND m2.finished_at IS NOT NULL
  )
) AS missing_migrations
ON CONFLICT DO NOTHING;

-- 查看结果
SELECT migration_name, finished_at FROM "_prisma_migrations" 
WHERE migration_name LIKE '%daily_issue%';

EOF
```

### 步骤 3：继续执行迁移

```bash
cd /www/wwwroot/linklore
pnpm prisma:migrate
```

## 说明
这些迁移是添加每日议题功能的用户关联，暂时不需要，所以可以跳过。





