# 验证代码版本

## 检查服务器代码版本

在服务器上执行：

```bash
cd /www/wwwroot/linklore

# 检查 session.ts 第 60 行是否有新日志
sed -n '58,62p' apps/web/lib/auth/session.ts

# 应该看到：
# 	if (!token) {
# 		// 生产环境也记录，方便调试
# 		console.warn('[Session] No token found in cookies');
# 		return null;
# 	}

# 检查 me/route.ts 第 8 行是否有新日志
sed -n '6,10p' apps/web/app/api/auth/me/route.ts

# 应该看到：
# 		const session = await readSession();
# 		console.log('[Auth Me API] Session:', session ? { sub: session.sub, email: session.email } : 'null');
# 		if (!session?.sub) {
# 			console.warn('[Auth Me API] No session or no sub');
```

如果看不到这些日志，说明代码没有更新，需要拉取最新代码。

---

## 拉取最新代码

```bash
cd /www/wwwroot/linklore && \
echo "==========================================" && \
echo "拉取最新代码并重启服务" && \
echo "==========================================" && \
echo "" && \
echo "[1/3] 解决 Git 冲突..." && \
git checkout -- ecosystem.config.js && \
rm -f prisma/migrations/manual_add_user_avatar.sql && \
echo "✓ 冲突已解决" && \
echo "" && \
echo "[2/3] 拉取最新代码..." && \
git pull origin master && \
echo "✓ 代码已更新" && \
echo "" && \
echo "[3/3] 重启服务..." && \
pm2 restart linklore-web && \
echo "✓ 服务已重启"
```

---

## 测试步骤

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

5. **查看服务器日志**：

```bash
pm2 logs linklore-web --lines 50
```

应该看到：
- `[Session] No token found in cookies` 或
- `[Session] Token verification failed:` 或
- `[Auth Me API] Session: { sub: '...', email: '...' }`

---

**请先检查代码版本，然后拉取最新代码并测试！**

