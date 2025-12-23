-- 修复版本：先创建表，再修改表
-- 如果表已存在，CREATE TABLE IF NOT EXISTS 不会报错

-- 创建 DailyIssue 表（如果不存在）
CREATE TABLE IF NOT EXISTS "DailyIssue" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caseDescription" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "difficulty" INTEGER,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyIssue_pkey" PRIMARY KEY ("id")
);

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS "DailyIssue_date_key" ON "DailyIssue"("date");

-- 创建索引
CREATE INDEX IF NOT EXISTS "DailyIssue_date_idx" ON "DailyIssue"("date");
CREATE INDEX IF NOT EXISTS "DailyIssue_status_idx" ON "DailyIssue"("status");
CREATE INDEX IF NOT EXISTS "DailyIssue_status_date_idx" ON "DailyIssue"("status", "date");

-- 创建 IssueNode 表
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

-- 创建唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS "IssueNode_issueId_nodeKey_key" ON "IssueNode"("issueId", "nodeKey");

-- 创建索引
CREATE INDEX IF NOT EXISTS "IssueNode_issueId_idx" ON "IssueNode"("issueId");
CREATE INDEX IF NOT EXISTS "IssueNode_issueId_stage_idx" ON "IssueNode"("issueId", "stage");
CREATE INDEX IF NOT EXISTS "IssueNode_issueId_nodeKey_idx" ON "IssueNode"("issueId", "nodeKey");

-- 创建 IssuePath 表
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

-- 创建索引
CREATE INDEX IF NOT EXISTS "IssuePath_issueId_idx" ON "IssuePath"("issueId");
CREATE INDEX IF NOT EXISTS "IssuePath_userId_idx" ON "IssuePath"("userId");
CREATE INDEX IF NOT EXISTS "IssuePath_date_idx" ON "IssuePath"("date");
CREATE INDEX IF NOT EXISTS "IssuePath_issueId_date_idx" ON "IssuePath"("issueId", "date");

-- 创建 IssueResult 表
CREATE TABLE IF NOT EXISTS "IssueResult" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "pathPattern" JSONB NOT NULL,
    "resultTemplate" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IssueResult_pkey" PRIMARY KEY ("id")
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "IssueResult_issueId_idx" ON "IssueResult"("issueId");

-- 创建 IssueFeedback 表
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

-- 创建索引
CREATE INDEX IF NOT EXISTS "IssueFeedback_issueId_idx" ON "IssueFeedback"("issueId");
CREATE INDEX IF NOT EXISTS "IssueFeedback_userId_idx" ON "IssueFeedback"("userId");
CREATE INDEX IF NOT EXISTS "IssueFeedback_pathId_idx" ON "IssueFeedback"("pathId");

-- 创建 IssueAnalytics 表
CREATE TABLE IF NOT EXISTS "IssueAnalytics" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pathDistribution" JSONB NOT NULL,
    "averageTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IssueAnalytics_pkey" PRIMARY KEY ("id")
);

-- 创建唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS "IssueAnalytics_issueId_key" ON "IssueAnalytics"("issueId");

-- 创建索引
CREATE INDEX IF NOT EXISTS "IssueAnalytics_date_idx" ON "IssueAnalytics"("date");

-- 创建外键约束
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'IssueResult_issueId_fkey'
    ) THEN
        ALTER TABLE "IssueResult" 
        ADD CONSTRAINT "IssueResult_issueId_fkey" 
        FOREIGN KEY ("issueId") REFERENCES "DailyIssue"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'IssueFeedback_issueId_fkey'
    ) THEN
        ALTER TABLE "IssueFeedback" 
        ADD CONSTRAINT "IssueFeedback_issueId_fkey" 
        FOREIGN KEY ("issueId") REFERENCES "DailyIssue"("id") ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'IssueAnalytics_issueId_fkey'
    ) THEN
        ALTER TABLE "IssueAnalytics" 
        ADD CONSTRAINT "IssueAnalytics_issueId_fkey" 
        FOREIGN KEY ("issueId") REFERENCES "DailyIssue"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- 原有的迁移内容：添加用户关系
-- AlterTable: Add user relation to IssuePath
ALTER TABLE "IssuePath" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- AddForeignKey: IssuePath.userId -> User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'IssuePath_userId_fkey'
    ) THEN
        ALTER TABLE "IssuePath" 
        ADD CONSTRAINT "IssuePath_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "User"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable: Add user relation to IssueFeedback
ALTER TABLE "IssueFeedback" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- AddForeignKey: IssueFeedback.userId -> User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'IssueFeedback_userId_fkey'
    ) THEN
        ALTER TABLE "IssueFeedback" 
        ADD CONSTRAINT "IssueFeedback_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "User"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- 添加 IssueFeedback.pathId 外键
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'IssueFeedback_pathId_fkey'
    ) THEN
        ALTER TABLE "IssueFeedback" 
        ADD CONSTRAINT "IssueFeedback_pathId_fkey" 
        FOREIGN KEY ("pathId") 
        REFERENCES "IssuePath"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;




