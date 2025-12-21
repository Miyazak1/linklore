// 直接测试API端点
const http = require('http');

const searchTerm = '双峰';
const encodedSearch = encodeURIComponent(searchTerm);
const url = `http://localhost:3000/api/books/list?search=${encodedSearch}&sort=latest&page=1&limit=50`;

console.log('测试API端点:');
console.log('URL:', url);
console.log('搜索词:', searchTerm);
console.log('编码后的搜索词:', encodedSearch);
console.log('\n发送请求...\n');

const req = http.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('API响应状态:', res.statusCode);
      console.log('API响应:', JSON.stringify(result, null, 2));
      console.log('\n返回的书籍数量:', result.books?.length || 0);
      if (result.books && result.books.length > 0) {
        console.log('书籍列表:');
        result.books.forEach((book, i) => {
          console.log(`  ${i + 1}. "${book.title}" (${book.author || '无作者'})`);
        });
      }
    } catch (err) {
      console.error('解析响应失败:', err);
      console.log('原始响应:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('请求失败:', err.message);
  console.log('\n提示: 请确保开发服务器正在运行 (pnpm dev)');
});

req.end();

