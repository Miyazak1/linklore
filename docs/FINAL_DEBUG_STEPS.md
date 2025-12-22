# 最终调试步骤

## 当前情况

- 登录成功（从 audit 日志可以看出）
- 但 `/api/auth/me` 返回 `{user: null}`
- 没有看到调试日志

---

## 关键问题

**Cookie 已保存，但 session 读取失败**。可能的原因：
1. **SESSION_SECRET 不匹配** - 创建 Cookie 时使用的 secret 和读取时使用的 secret 不一致
2. **Token 过期或损坏** - JWT token 有问题
3. **Cookie 域名不匹配** - Cookie 在 `www.mooyu.fun`，但访问的是 `mooyu.fun`

---

## 立即执行的步骤

### 1. 检查代码是否已更新

```bash
cd /www/wwwroot/linklore

# 检查 me/route.ts 第 8 行
sed -n '6,12p' apps/web/app/api/auth/me/route.ts
```

如果看不到 `console.log('[Auth Me API] Session:', ...)`，说明代码没有更新。

### 2. 拉取最新代码

```bash
cd /www/wwwroot/linklore && \
git pull origin master && \
pm2 restart linklore-web
```

### 3. 检查 SESSION_SECRET

```bash
cd /www/wwwroot/linklore

# 检查环境变量
cat apps/web/.env.production | grep SESSION_SECRET

# 确保只有一个 SESSION_SECRET，没有重复定义
```

### 4. 测试并查看完整日志

1. **清除浏览器 Cookie 和缓存**
2. **访问**：`http://www.mooyu.fun/signin`（**必须使用 www**）
3. **登录**
4. **在浏览器控制台执行**：

```javascript
fetch('/api/auth/me')
  .then(res => res.json())
  .then(data => {
    console.log('认证状态:', data);
  });
```

5. **立即查看服务器日志（不要过滤）**：

```bash
pm2 logs linklore-web --lines 100 --nostream
```

查找：
- `[Session] No token found in cookies` - 没有找到 Cookie
- `[Session] Token verification failed:` - Token 验证失败（会显示详细错误）
- `[Auth Me API] Session:` - Session 读取结果

---

## 如果仍然没有调试日志

可能是日志被重定向了，检查日志文件：

```bash
cd /www/wwwroot/linklore

# 查看错误日志
tail -50 logs/web-error.log | grep -i "session\|auth"

# 查看输出日志
tail -50 logs/web-out.log | grep -i "session\|auth"
```

---

## 临时解决方案：直接检查 Cookie 和 Session

在服务器上创建一个测试脚本：

```bash
cd /www/wwwroot/linklore

cat > test-session.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const { SignJWT, jwtVerify } = require('jose');

const prisma = new PrismaClient();

async function testSession() {
  // 检查 SESSION_SECRET
  const secret = process.env.SESSION_SECRET || 'dev-insecure-secret';
  console.log('SESSION_SECRET:', secret.substring(0, 10) + '...');
  console.log('SESSION_SECRET length:', secret.length);
  
  // 检查用户是否存在
  const user = await prisma.user.findUnique({
    where: { email: '495469022@qq.com' }
  });
  
  if (user) {
    console.log('用户存在:', user.email);
    console.log('用户 ID:', user.id);
  } else {
    console.log('用户不存在');
  }
  
  await prisma.$disconnect();
}

testSession();
EOF

node test-session.js
```

---

**请先检查代码是否已更新，然后查看完整的服务器日志，告诉我看到了什么！**

