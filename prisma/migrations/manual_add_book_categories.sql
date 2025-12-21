-- 手动添加书籍分类、标签等字段
-- 如果字段已存在，会报错但可以忽略

-- 添加分类字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Book' AND column_name = 'category'
    ) THEN
        ALTER TABLE "Book" ADD COLUMN "category" TEXT;
    END IF;
END $$;

-- 添加标签字段（数组）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Book' AND column_name = 'tags'
    ) THEN
        ALTER TABLE "Book" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
END $$;

-- 添加语言字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Book' AND column_name = 'language'
    ) THEN
        ALTER TABLE "Book" ADD COLUMN "language" TEXT;
    END IF;
END $$;

-- 添加ISBN字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Book' AND column_name = 'isbn'
    ) THEN
        ALTER TABLE "Book" ADD COLUMN "isbn" TEXT;
    END IF;
END $$;

-- 添加出版社字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Book' AND column_name = 'publisher'
    ) THEN
        ALTER TABLE "Book" ADD COLUMN "publisher" TEXT;
    END IF;
END $$;

-- 添加出版年份字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Book' AND column_name = 'publishYear'
    ) THEN
        ALTER TABLE "Book" ADD COLUMN "publishYear" INTEGER;
    END IF;
END $$;

-- 添加索引
CREATE INDEX IF NOT EXISTS "Book_category_idx" ON "Book"("category");
CREATE INDEX IF NOT EXISTS "Book_language_idx" ON "Book"("language");
CREATE INDEX IF NOT EXISTS "Book_publishYear_idx" ON "Book"("publishYear");

