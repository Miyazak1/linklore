# 检查代码是否已更新

## 当前情况

- 服务器日志显示登录成功
- 但没有看到调试日志（`[Session]` 或 `[Auth Me API]`）
- 可能代码还没有更新到服务器

---

## 检查步骤

### 1. 检查代码是否已更新

```bash
cd /www/wwwroot/linklore

# 检查 session.ts 文件是否有调试日志
grep -n "console.warn\|console.error" apps/web/lib/auth/session.ts

# 应该看到类似这样的行：
# 65: console.warn('[Session] No token found in cookies');
# 67: console.error('[Session] Token verification failed:', {
```

### 2. 检查 /api/auth/me 是否有调试日志

```bash
cd /www/wwwroot/linklore

# 检查 me/route.ts 文件
grep -n "console.log\|console.warn" apps/web/app/api/auth/me/route.ts

# 应该看到类似这样的行：
# 7: console.log('[Auth Me API] Session:', session ? { sub: session.sub, email: session.email } : 'null');
```

### 3. 如果代码没有更新，拉取最新代码

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

### 4. 查看完整日志（包括调试信息）

```bash
# 实时查看日志，不要过滤
pm2 logs linklore-web --lines 100

# 或者查看错误日志
tail -f /www/wwwroot/linklore/logs/web-error.log

# 或者查看输出日志
tail -f /www/wwwroot/linklore/logs/web-out.log
```

---

## 测试步骤

### 1. 清除浏览器 Cookie 和缓存

### 2. 访问并登录

访问：`http://www.mooyu.fun/signin`（使用 www）

### 3. 在浏览器控制台测试

```javascript
// 测试认证状态
fetch('/api/auth/me')
  .then(res => res.json())
  .then(data => {
    console.log('认证状态:', data);
  });
```

### 4. 查看服务器日志

应该看到：
- `[Session] No token found in cookies` 或
- `[Session] Token verification failed:` 或
- `[Auth Me API] Session: { sub: '...', email: '...' }`

---

## 如果代码已更新但仍然没有日志

可能是日志级别问题，检查：

```bash
# 检查环境变量
cat apps/web/.env.production | grep NODE_ENV

# 如果是 production，日志可能被抑制
# 可以临时改为 development 测试
```

---

**请先检查代码是否已更新，然后告诉我结果！**




