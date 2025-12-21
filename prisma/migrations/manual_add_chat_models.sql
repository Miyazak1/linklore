-- 手动迁移：添加聊天室相关表
-- 执行方式：psql -d linklore -f prisma/migrations/manual_add_chat_models.sql
-- 或者：npx prisma db execute --file prisma/migrations/manual_add_chat_models.sql --schema prisma/schema.prisma

-- 创建 ChatRoom 表
CREATE TABLE IF NOT EXISTS "ChatRoom" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "creatorId" TEXT NOT NULL,
    "participantId" TEXT,
    "topic" TEXT,
    "topicDescription" TEXT,
    "creatorDeletedAt" TIMESTAMP(3),
    "participantDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- 创建 ChatMessage 表
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'USER',
    "sequence" INTEGER NOT NULL,
    "isAdopted" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" TEXT,
    "moderationNote" TEXT,
    "moderationDetails" JSONB,
    "aiProvider" TEXT,
    "aiModel" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- 创建 ChatMessageReference 表
CREATE TABLE IF NOT EXISTS "ChatMessageReference" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "referencedMessageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessageReference_pkey" PRIMARY KEY ("id")
);

-- 创建外键约束
DO $$
BEGIN
    -- ChatRoom 外键
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ChatRoom_creatorId_fkey'
    ) THEN
        ALTER TABLE "ChatRoom" 
        ADD CONSTRAINT "ChatRoom_creatorId_fkey" 
        FOREIGN KEY ("creatorId") REFERENCES "User"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ChatRoom_participantId_fkey'
    ) THEN
        ALTER TABLE "ChatRoom" 
        ADD CONSTRAINT "ChatRoom_participantId_fkey" 
        FOREIGN KEY ("participantId") REFERENCES "User"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- ChatMessage 外键
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ChatMessage_roomId_fkey'
    ) THEN
        ALTER TABLE "ChatMessage" 
        ADD CONSTRAINT "ChatMessage_roomId_fkey" 
        FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ChatMessage_senderId_fkey'
    ) THEN
        ALTER TABLE "ChatMessage" 
        ADD CONSTRAINT "ChatMessage_senderId_fkey" 
        FOREIGN KEY ("senderId") REFERENCES "User"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- ChatMessageReference 外键
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ChatMessageReference_messageId_fkey'
    ) THEN
        ALTER TABLE "ChatMessageReference" 
        ADD CONSTRAINT "ChatMessageReference_messageId_fkey" 
        FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ChatMessageReference_referencedMessageId_fkey'
    ) THEN
        ALTER TABLE "ChatMessageReference" 
        ADD CONSTRAINT "ChatMessageReference_referencedMessageId_fkey" 
        FOREIGN KEY ("referencedMessageId") REFERENCES "ChatMessage"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS "ChatRoom_creatorId_idx" ON "ChatRoom"("creatorId");
CREATE INDEX IF NOT EXISTS "ChatRoom_participantId_idx" ON "ChatRoom"("participantId");
CREATE INDEX IF NOT EXISTS "ChatRoom_status_idx" ON "ChatRoom"("status");
CREATE INDEX IF NOT EXISTS "ChatRoom_updatedAt_idx" ON "ChatRoom"("updatedAt");

CREATE INDEX IF NOT EXISTS "ChatMessage_roomId_idx" ON "ChatMessage"("roomId");
CREATE INDEX IF NOT EXISTS "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");
CREATE INDEX IF NOT EXISTS "ChatMessage_sequence_idx" ON "ChatMessage"("sequence");
CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_roomId_sequence_idx" ON "ChatMessage"("roomId", "sequence");
CREATE INDEX IF NOT EXISTS "ChatMessage_roomId_deletedAt_idx" ON "ChatMessage"("roomId", "deletedAt");

CREATE INDEX IF NOT EXISTS "ChatMessageReference_messageId_idx" ON "ChatMessageReference"("messageId");
CREATE INDEX IF NOT EXISTS "ChatMessageReference_referencedMessageId_idx" ON "ChatMessageReference"("referencedMessageId");

