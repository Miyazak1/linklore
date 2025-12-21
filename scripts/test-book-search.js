const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSearch() {
  try {
    const searchTerm = '双峰';
    
    console.log(`\n测试搜索: "${searchTerm}"\n`);
    
    // 测试1：简单的contains查询
    console.log('1. 测试 title contains:');
    const result1 = await prisma.book.findMany({
      where: {
        title: { contains: searchTerm, mode: 'insensitive' }
      }
    });
    console.log(`   找到 ${result1.length} 本:`, result1.map(b => b.title));
    
    // 测试2：OR查询（和API中一样的逻辑）
    console.log('\n2. 测试 OR查询（title/author/overview）:');
    const result2 = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { author: { contains: searchTerm, mode: 'insensitive' } },
          { overview: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
    });
    console.log(`   找到 ${result2.length} 本:`, result2.map(b => ({ title: b.title, author: b.author })));
    
    // 测试3：检查所有书籍的标题
    console.log('\n3. 所有书籍:');
    const allBooks = await prisma.book.findMany({
      select: { title: true, author: true }
    });
    allBooks.forEach(b => {
      console.log(`   - "${b.title}" (${b.author || '无作者'})`);
      console.log(`     包含"双峰"?: ${b.title.includes('双峰')}`);
    });
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSearch();

