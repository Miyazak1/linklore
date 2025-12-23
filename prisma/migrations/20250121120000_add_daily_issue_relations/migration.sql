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





