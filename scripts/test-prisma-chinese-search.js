const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testChineseSearch() {
  try {
    const searchTerm = '双峰';
    
    console.log(`\n测试中文搜索: "${searchTerm}"\n`);
    
    // 测试1：直接查询所有书籍
    console.log('1. 查询所有书籍:');
    const allBooks = await prisma.book.findMany({
      select: { id: true, title: true, author: true }
    });
    console.log(`   找到 ${allBooks.length} 本:`, allBooks);
    
    // 测试2：使用contains查询（和API中一样）
    console.log('\n2. 使用 contains 查询:');
    const result1 = await prisma.book.findMany({
      where: {
        title: { contains: searchTerm, mode: 'insensitive' }
      },
      select: { id: true, title: true, author: true }
    });
    console.log(`   找到 ${result1.length} 本:`, result1);
    
    // 测试3：使用OR查询（和API中完全一样）
    console.log('\n3. 使用 OR 查询（title/author/overview）:');
    const result2 = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { author: { contains: searchTerm, mode: 'insensitive' } },
          { overview: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, author: true }
    });
    console.log(`   找到 ${result2.length} 本:`, result2);
    
    // 测试4：使用AND包装（和API中完全一样）
    console.log('\n4. 使用 AND 包装（和API完全一样）:');
    const whereConditions = [];
    whereConditions.push({
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { author: { contains: searchTerm, mode: 'insensitive' } },
        { overview: { contains: searchTerm, mode: 'insensitive' } },
      ],
    });
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};
    console.log('   查询条件:', JSON.stringify(where, null, 2));
    
    const result3 = await prisma.book.findMany({
      where,
      select: { id: true, title: true, author: true }
    });
    console.log(`   找到 ${result3.length} 本:`, result3);
    
    // 测试5：检查字符串编码
    console.log('\n5. 字符串编码检查:');
    console.log(`   searchTerm: "${searchTerm}"`);
    console.log(`   长度: ${searchTerm.length}`);
    console.log(`   UTF-8 bytes:`, Buffer.from(searchTerm, 'utf8'));
    console.log(`   字符码:`, [...searchTerm].map(c => c.charCodeAt(0)));
    
  } catch (error) {
    console.error('错误:', error);
    console.error('堆栈:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testChineseSearch();

