// 模拟API请求来测试搜索逻辑
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAPISearch() {
  try {
    // 模拟API的参数解析
    const searchTerm = '双峰';
    const sort = 'latest';
    
    console.log(`\n模拟API搜索: "${searchTerm}", sort: "${sort}"\n`);
    
    // 构建查询条件（和API中完全一样）
    const whereConditions = [];
    
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim();
      whereConditions.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { author: { contains: term, mode: 'insensitive' } },
          { overview: { contains: term, mode: 'insensitive' } },
        ],
      });
      console.log('添加搜索条件:', term);
    }
    
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};
    console.log('最终查询条件:', JSON.stringify(where, null, 2));
    
    // 构建排序
    let orderBy;
    if (sort === 'title') {
      orderBy = { title: 'asc' };
    } else if (sort === 'author') {
      orderBy = { author: 'asc' };
    } else {
      orderBy = { createdAt: 'desc' };
    }
    console.log('排序:', JSON.stringify(orderBy, null, 2));
    
    // 查询
    const total = await prisma.book.count({ where });
    console.log(`总数: ${total}`);
    
    const books = await prisma.book.findMany({
      where,
      orderBy,
      take: 50,
      include: {
        assets: {
          select: {
            id: true,
            bookId: true,
            fileKey: true,
            mime: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    
    console.log(`\n找到 ${books.length} 本书:`);
    books.forEach(b => {
      console.log(`- "${b.title}" (${b.author || '无作者'})`);
    });
    
  } catch (error) {
    console.error('错误:', error);
    console.error('堆栈:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAPISearch();





