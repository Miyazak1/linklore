# 检查服务器日志中的调试信息

## 当前情况

- 登录成功（从 audit 日志可以看出）
- 但 `/api/auth/me` 返回 `{user: null}`
- 没有看到调试日志

---

## 检查步骤

### 1. 查看完整的服务器日志（不要过滤）

```bash
pm2 logs linklore-web --lines 100
```

查找以下关键词：
- `[Session]` - Session 相关日志
- `[Auth Me API]` - 认证 API 日志
- `Token verification failed` - Token 验证失败
- `No token found` - 没有找到 Cookie

### 2. 如果看不到调试日志，检查代码是否已更新

```bash
cd /www/wwwroot/linklore

# 检查 me/route.ts 是否有调试日志
grep -n "console.log\|console.warn" apps/web/app/api/auth/me/route.ts

# 应该看到：
# 8: console.log('[Auth Me API] Session:', session ? { sub: session.sub, email: session.email } : 'null');
# 10: console.warn('[Auth Me API] No session or no sub');
```

### 3. 如果代码没有更新，拉取最新代码

```bash
cd /www/wwwroot/linklore && \
git pull origin master && \
pm2 restart linklore-web
```

### 4. 测试并查看日志

1. **清除浏览器 Cookie 和缓存**
2. **访问**：`http://www.mooyu.fun/signin`（使用 www）
3. **登录**
4. **在浏览器控制台执行**：

```javascript
fetch('/api/auth/me')
  .then(res => res.json())
  .then(data => {
    console.log('认证状态:', data);
  });
```

5. **立即查看服务器日志**：

```bash
pm2 logs linklore-web --lines 50 --nostream
```

应该看到：
- `[Session] No token found in cookies` - 如果没有找到 Cookie
- `[Session] Token verification failed:` - 如果 Token 验证失败（会显示详细错误信息）
- `[Auth Me API] Session: { sub: '...', email: '...' }` - 如果 Session 读取成功
- `[Auth Me API] No session or no sub` - 如果 Session 为空

---

## 可能的问题

### 问题 1：SESSION_SECRET 不匹配

**现象**：日志显示 `Token verification failed`

**解决**：
1. 检查 `.env.production` 中的 `SESSION_SECRET`
2. 确保创建 Cookie 和读取 Cookie 时使用同一个 secret
3. 如果修改了 secret，需要清除所有 Cookie 并重新登录

### 问题 2：Cookie 没有发送到服务器

**现象**：日志显示 `No token found in cookies`

**可能原因**：
- Cookie 域名不匹配（访问 `mooyu.fun`，但 Cookie 在 `www.mooyu.fun`）
- Cookie 被浏览器阻止
- Cookie 过期

**解决**：
- 统一使用 `www.mooyu.fun` 访问
- 清除浏览器 Cookie 并重新登录

---

## 快速测试

在浏览器控制台执行：

```javascript
// 检查 Cookie
console.log('所有 Cookie:', document.cookie);

// 检查 ll_session Cookie
const cookies = document.cookie.split(';').reduce((acc, cookie) => {
  const [name, value] = cookie.trim().split('=');
  acc[name] = value;
  return acc;
}, {});
console.log('ll_session:', cookies.ll_session ? '存在' : '不存在');

// 测试认证状态
fetch('/api/auth/me')
  .then(res => res.json())
  .then(data => {
    console.log('认证状态:', data);
  });
```

---

**请查看完整的服务器日志，告诉我看到了什么！**

