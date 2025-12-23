const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addBookFields() {
  try {
    console.log('开始添加书籍字段...');

    // 使用原始SQL查询来执行迁移
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'Book' AND column_name = 'category'
          ) THEN
              ALTER TABLE "Book" ADD COLUMN "category" TEXT;
          END IF;
      END $$;
    `);
    console.log('✓ 添加 category 字段');

    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'Book' AND column_name = 'tags'
          ) THEN
              ALTER TABLE "Book" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
          END IF;
      END $$;
    `);
    console.log('✓ 添加 tags 字段');

    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'Book' AND column_name = 'language'
          ) THEN
              ALTER TABLE "Book" ADD COLUMN "language" TEXT;
          END IF;
      END $$;
    `);
    console.log('✓ 添加 language 字段');

    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'Book' AND column_name = 'isbn'
          ) THEN
              ALTER TABLE "Book" ADD COLUMN "isbn" TEXT;
          END IF;
      END $$;
    `);
    console.log('✓ 添加 isbn 字段');

    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'Book' AND column_name = 'publisher'
          ) THEN
              ALTER TABLE "Book" ADD COLUMN "publisher" TEXT;
          END IF;
      END $$;
    `);
    console.log('✓ 添加 publisher 字段');

    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'Book' AND column_name = 'publishYear'
          ) THEN
              ALTER TABLE "Book" ADD COLUMN "publishYear" INTEGER;
          END IF;
      END $$;
    `);
    console.log('✓ 添加 publishYear 字段');

    // 添加索引
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Book_category_idx" ON "Book"("category");
    `);
    console.log('✓ 创建 category 索引');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Book_language_idx" ON "Book"("language");
    `);
    console.log('✓ 创建 language 索引');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Book_publishYear_idx" ON "Book"("publishYear");
    `);
    console.log('✓ 创建 publishYear 索引');

    console.log('\n✅ 所有字段添加完成！');
  } catch (error) {
    console.error('❌ 执行失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addBookFields()
  .then(() => {
    console.log('迁移完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移失败:', error);
    process.exit(1);
  });





