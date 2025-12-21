-- 手动迁移：添加每日百科游戏相关表
-- 执行方式：psql -d linklore -f prisma/migrations/manual_add_baike_game_models.sql
-- 或者：npx prisma db execute --file prisma/migrations/manual_add_baike_game_models.sql --schema prisma/schema.prisma

-- 创建 BaikeQuestion 表
CREATE TABLE IF NOT EXISTS "BaikeQuestion" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "difficulty" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BaikeQuestion_pkey" PRIMARY KEY ("id")
);

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS "BaikeQuestion_date_key" ON "BaikeQuestion"("date");

-- 创建日期索引
CREATE INDEX IF NOT EXISTS "BaikeQuestion_date_idx" ON "BaikeQuestion"("date");

-- 创建 BaikeGameRecord 表
CREATE TABLE IF NOT EXISTS "BaikeGameRecord" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT,
    "date" TEXT NOT NULL,
    "guessCount" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "guesses" JSONB NOT NULL DEFAULT '[]',
    "revealedChars" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BaikeGameRecord_pkey" PRIMARY KEY ("id")
);

-- 创建外键约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'BaikeGameRecord_questionId_fkey'
    ) THEN
        ALTER TABLE "BaikeGameRecord" 
        ADD CONSTRAINT "BaikeGameRecord_questionId_fkey" 
        FOREIGN KEY ("questionId") REFERENCES "BaikeQuestion"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS "BaikeGameRecord_questionId_idx" ON "BaikeGameRecord"("questionId");
CREATE INDEX IF NOT EXISTS "BaikeGameRecord_date_idx" ON "BaikeGameRecord"("date");
CREATE INDEX IF NOT EXISTS "BaikeGameRecord_userId_idx" ON "BaikeGameRecord"("userId");

-- 创建唯一约束（每个用户每天只能有一条记录）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'BaikeGameRecord_date_userId_key'
    ) THEN
        CREATE UNIQUE INDEX "BaikeGameRecord_date_userId_key" 
        ON "BaikeGameRecord"("date", "userId") 
        WHERE "userId" IS NOT NULL;
    END IF;
END $$;

