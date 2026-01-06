-- 游戏工坊 - 添加 GameInstance 和 GamePlay 表
-- 如果表已存在则跳过

-- 创建 GameInstance 表
CREATE TABLE IF NOT EXISTS "GameInstance" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modules" JSONB NOT NULL,
    "questions" JSONB NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "difficulty" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameInstance_pkey" PRIMARY KEY ("id")
);

-- 创建 GamePlay 表
CREATE TABLE IF NOT EXISTS "GamePlay" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT,
    "score" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB NOT NULL,
    "timeSpent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamePlay_pkey" PRIMARY KEY ("id")
);

-- 创建外键约束（如果不存在）
DO $$
BEGIN
    -- GameInstance.authorId -> User.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'GameInstance_authorId_fkey'
    ) THEN
        ALTER TABLE "GameInstance" 
        ADD CONSTRAINT "GameInstance_authorId_fkey" 
        FOREIGN KEY ("authorId") 
        REFERENCES "User"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;

    -- GamePlay.gameId -> GameInstance.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'GamePlay_gameId_fkey'
    ) THEN
        ALTER TABLE "GamePlay" 
        ADD CONSTRAINT "GamePlay_gameId_fkey" 
        FOREIGN KEY ("gameId") 
        REFERENCES "GameInstance"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;

    -- GamePlay.userId -> User.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'GamePlay_userId_fkey'
    ) THEN
        ALTER TABLE "GamePlay" 
        ADD CONSTRAINT "GamePlay_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "User"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS "GameInstance_authorId_idx" ON "GameInstance"("authorId");
CREATE INDEX IF NOT EXISTS "GameInstance_status_idx" ON "GameInstance"("status");
CREATE INDEX IF NOT EXISTS "GameInstance_isPublic_idx" ON "GameInstance"("isPublic");
CREATE INDEX IF NOT EXISTS "GameInstance_createdAt_idx" ON "GameInstance"("createdAt");

CREATE INDEX IF NOT EXISTS "GamePlay_gameId_idx" ON "GamePlay"("gameId");
CREATE INDEX IF NOT EXISTS "GamePlay_userId_idx" ON "GamePlay"("userId");
CREATE INDEX IF NOT EXISTS "GamePlay_createdAt_idx" ON "GamePlay"("createdAt");



