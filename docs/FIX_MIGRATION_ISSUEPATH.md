# 修复 IssuePath 表缺失的迁移错误

## 错误信息

```
Error: P3018
relation "IssuePath" does not exist
```

## 问题原因

迁移 `20250121120000_add_daily_issue_relations` 试图修改 `IssuePath` 表，但这个表还没有被创建。`IssuePath` 表应该在某个迁移中创建，但可能缺失了。

## 解决方案

### 方式1：修复迁移文件（推荐）

修改迁移文件，在修改表之前先创建表：

```bash
cd /www/wwwroot/linklore

# 编辑迁移文件
nano prisma/migrations/20250121120000_add_daily_issue_relations/migration.sql
```

在文件开头添加创建表的语句：

```sql
-- 先创建表（如果不存在）
CREATE TABLE IF NOT EXISTS "DailyIssue" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "caseDescription" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "difficulty" INTEGER,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IssueNode" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentNodeKey" TEXT,
    "nextNodeKeys" JSONB NOT NULL,
    "isRoot" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    CONSTRAINT "IssueNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IssuePath" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT,
    "date" TEXT NOT NULL,
    "path" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssuePath_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IssueResult" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "pathPattern" JSONB NOT NULL,
    "resultTemplate" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IssueResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IssueFeedback" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT,
    "pathId" TEXT,
    "helpful" BOOLEAN,
    "confusingStage" INTEGER,
    "isNeutral" BOOLEAN,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IssueAnalytics" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL UNIQUE,
    "date" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pathDistribution" JSONB NOT NULL,
    "averageTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IssueAnalytics_pkey" PRIMARY KEY ("id")
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "DailyIssue_date_idx" ON "DailyIssue"("date");
CREATE INDEX IF NOT EXISTS "DailyIssue_status_idx" ON "DailyIssue"("status");
CREATE INDEX IF NOT EXISTS "IssueNode_issueId_idx" ON "IssueNode"("issueId");
CREATE INDEX IF NOT EXISTS "IssuePath_issueId_idx" ON "IssuePath"("issueId");
CREATE INDEX IF NOT EXISTS "IssuePath_userId_idx" ON "IssuePath"("userId");
CREATE INDEX IF NOT EXISTS "IssuePath_date_idx" ON "IssuePath"("date");

-- 创建外键
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'IssueNode_issueId_fkey'
    ) THEN
        ALTER TABLE "IssueNode" 
        ADD CONSTRAINT "IssueNode_issueId_fkey" 
        FOREIGN KEY ("issueId") REFERENCES "DailyIssue"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'IssuePath_issueId_fkey'
    ) THEN
        ALTER TABLE "IssuePath" 
        ADD CONSTRAINT "IssuePath_issueId_fkey" 
        FOREIGN KEY ("issueId") REFERENCES "DailyIssue"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 原有的迁移内容（修改表）
-- AlterTable: Add user relation to IssuePath
ALTER TABLE "IssuePath" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- ... 其余内容保持不变
```

### 方式2：标记迁移为已应用（快速修复）

如果表已经通过其他方式创建，可以标记迁移为已应用：

```bash
cd /www/wwwroot/linklore

# 标记迁移为已应用（跳过执行）
pnpm prisma migrate resolve --applied 20250121120000_add_daily_issue_relations

# 继续运行其他迁移
pnpm prisma migrate deploy
```

### 方式3：手动创建表后继续迁移

```bash
cd /www/wwwroot/linklore

# 1. 手动创建表（使用 psql 或数据库管理工具）
# 执行上面的 CREATE TABLE 语句

# 2. 标记迁移为已应用
pnpm prisma migrate resolve --applied 20250121120000_add_daily_issue_relations

# 3. 继续迁移
pnpm prisma migrate deploy
```

### 方式4：完全重置（最彻底）

如果以上方法都不行，完全重置数据库：

```bash
cd /www/wwwroot/linklore

# 1. 停止服务
pm2 stop all

# 2. 完全重置数据库
pnpm prisma migrate reset --force

# 3. 如果 reset 失败，手动清空数据库
# 在数据库管理工具中执行：
# DROP SCHEMA public CASCADE;
# CREATE SCHEMA public;

# 4. 重新运行迁移（使用修复后的迁移文件）
pnpm prisma migrate deploy

# 5. 执行手动 SQL
pnpm prisma db execute --file prisma/migrations/manual_add_book_categories.sql --schema prisma/schema.prisma
pnpm prisma db execute --file prisma/migrations/manual_add_baike_game_models.sql --schema prisma/schema.prisma
pnpm prisma db execute --file prisma/migrations/manual_add_chat_models.sql --schema prisma/schema.prisma

# 6. 生成 Prisma Client
pnpm prisma:generate

# 7. 构建项目
pnpm build

# 8. 重启服务
pm2 restart ecosystem.config.js
```

## 推荐操作流程

1. **先尝试方式2**（标记为已应用），如果表已存在
2. **如果表不存在**，使用方式1修复迁移文件
3. **如果都不行**，使用方式4完全重置

## 验证修复

修复后验证：

```bash
# 检查迁移状态
pnpm prisma migrate status

# 检查表是否存在
psql $DATABASE_URL -c "\dt \"IssuePath\""

# 应该看到 IssuePath 表
```

---

**完成！修复后重新运行迁移即可。**

