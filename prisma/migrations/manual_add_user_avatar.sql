-- 手动添加 User.avatarUrl 字段
-- 如果字段已存在，会报错但可以忽略

-- 添加 avatarUrl 字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'avatarUrl'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
    END IF;
END $$;
