const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBooks() {
  try {
    const books = await prisma.book.findMany({
      select: {
        id: true,
        title: true,
        author: true,
      },
    });
    
    console.log('数据库中的书籍:');
    console.log(`共 ${books.length} 本\n`);
    books.forEach((b, i) => {
      console.log(`${i + 1}. 标题: "${b.title}"`);
      console.log(`   作者: ${b.author || '(无)'}`);
      console.log(`   ID: ${b.id}\n`);
    });
    
    // 测试搜索
    console.log('\n测试搜索"双峰":');
    const searchResult = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: '双峰', mode: 'insensitive' } },
          { author: { contains: '双峰', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        author: true,
      },
    });
    console.log(`找到 ${searchResult.length} 本匹配的书籍`);
    searchResult.forEach(b => {
      console.log(`- "${b.title}" (${b.author || '无作者'})`);
    });
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBooks();





