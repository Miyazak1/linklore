# 修复 Cookie Secure 优先级问题

## 问题

即使设置了 `COOKIE_SECURE=false`，如果 `NEXT_PUBLIC_APP_URL` 是 `https://`，代码仍然会使用 `secure: true`，导致 HTTP 环境下 Cookie 无法保存。

---

## 解决方案

已修复 `shouldUseSecureCookie()` 函数，确保 `COOKIE_SECURE` 环境变量的优先级最高：

**优先级顺序**：
1. **`COOKIE_SECURE` 环境变量**（最高优先级）- 如果设置了，直接使用，覆盖其他所有判断
2. `NEXT_PUBLIC_APP_URL` - 如果 URL 是 `https://`，使用 `secure: true`
3. `NODE_ENV` - 开发环境默认 `secure: false`
4. 默认值 - `secure: false`

---

## 在服务器上执行

### 1. 确保环境变量正确设置

```bash
cd /www/wwwroot/linklore

# 检查环境变量
cat apps/web/.env.production | grep COOKIE_SECURE
cat apps/web/.env.production | grep NEXT_PUBLIC_APP_URL
```

应该看到：
```bash
COOKIE_SECURE=false
NEXT_PUBLIC_APP_URL="https://www.mooyu.fun"
```

**重要**：即使 `NEXT_PUBLIC_APP_URL` 是 `https://`，只要设置了 `COOKIE_SECURE=false`，就会使用 `secure: false`。

### 2. 如果使用 HTTP，建议同时修改 URL

```bash
cd /www/wwwroot/linklore

# 编辑环境变量
nano apps/web/.env.production
```

修改为：
```bash
COOKIE_SECURE=false
NEXT_PUBLIC_APP_URL="http://www.mooyu.fun"
```

### 3. 拉取最新代码并重启

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
echo "✓ 服务已重启" && \
echo "" && \
echo "==========================================" && \
echo "完成！" && \
echo "=========================================="
```

---

## 验证

1. **清除浏览器 Cookie 和缓存**
2. **访问**：`http://www.mooyu.fun/signin`
3. **登录**
4. **检查 Cookie**：
   - 打开开发者工具（F12）
   - **Application** → **Cookies** → `http://www.mooyu.fun`
   - 应该看到 `ll_session` Cookie
   - `Secure` 列应该是 `false`

5. **预期结果**：
   - 登录成功
   - Cookie 已保存
   - 页面刷新后仍然保持登录状态
   - 右上角显示用户信息

---

## 如果仍然不行

### 检查服务日志

```bash
pm2 logs linklore-web --lines 50
```

查看是否有错误信息。

### 手动测试 Cookie 设置

在服务器上创建一个测试脚本：

```bash
cd /www/wwwroot/linklore

cat > test-cookie.js << 'EOF'
console.log('COOKIE_SECURE:', process.env.COOKIE_SECURE);
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// 模拟 shouldUseSecureCookie 逻辑
function shouldUseSecureCookie() {
	if (process.env.COOKIE_SECURE !== undefined) {
		const value = process.env.COOKIE_SECURE.toLowerCase().trim();
		return value === 'true' || value === '1';
	}
	const appUrl = process.env.NEXT_PUBLIC_APP_URL;
	if (appUrl && appUrl.startsWith('https://')) {
		return true;
	}
	if (process.env.NODE_ENV === 'development') {
		return false;
	}
	return false;
}

console.log('shouldUseSecureCookie():', shouldUseSecureCookie());
EOF

node test-cookie.js
```

应该输出：
```
COOKIE_SECURE: false
NEXT_PUBLIC_APP_URL: https://www.mooyu.fun
NODE_ENV: production
shouldUseSecureCookie(): false
```

---

**完成！现在 Cookie 应该可以正常保存了！**

