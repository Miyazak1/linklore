# 调试 Cookie 无法保存问题

## 当前情况

- 访问域名：`http://mooyu.fun`（无 www）
- 环境变量可能配置：`www.mooyu.fun`
- 登录后仍然显示"登录"和"注册"按钮

---

## 排查步骤

### 1. 检查 Cookie 是否保存

打开浏览器开发者工具（F12）：
1. **Application** 标签
2. 左侧 **Cookies** → 展开 `http://mooyu.fun`
3. 检查是否有 `ll_session` Cookie

**如果没有 Cookie**：
- Cookie 没有被保存
- 可能是域名不匹配或 secure 标志问题

**如果有 Cookie**：
- Cookie 已保存，但前端状态没有刷新
- 需要检查前端状态更新逻辑

---

### 2. 检查域名配置

在服务器上检查：

```bash
cd /www/wwwroot/linklore

# 检查环境变量中的域名
cat apps/web/.env.production | grep NEXT_PUBLIC_APP_URL
```

**如果显示**：`NEXT_PUBLIC_APP_URL="https://www.mooyu.fun"`

**问题**：访问的是 `mooyu.fun`，但配置的是 `www.mooyu.fun`，可能导致 Cookie 域名不匹配。

**解决方案**：
1. 统一使用 `www.mooyu.fun` 访问
2. 或者修改环境变量支持两个域名

---

### 3. 检查 Cookie 设置

在服务器上检查代码是否正确：

```bash
cd /www/wwwroot/linklore

# 检查 session.ts 文件
grep -A 10 "shouldUseSecureCookie" apps/web/lib/auth/session.ts
```

应该看到：
```typescript
function shouldUseSecureCookie(): boolean {
	if (process.env.COOKIE_SECURE !== undefined) {
		const value = process.env.COOKIE_SECURE.toLowerCase().trim();
		return value === 'true' || value === '1';
	}
	// ...
}
```

---

### 4. 测试登录 API

在浏览器控制台（F12 → Console）执行：

```javascript
// 测试登录
fetch('/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: '495469022@qq.com',
    password: 'Nuan2230543@'
  })
})
.then(res => res.json())
.then(data => {
  console.log('登录结果:', data);
  // 检查 Cookie
  setTimeout(() => {
    console.log('Cookies:', document.cookie);
    // 检查认证状态
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(user => console.log('用户信息:', user));
  }, 1000);
});
```

**预期结果**：
- 登录成功：`{ ok: true }`
- Cookie 应该包含 `ll_session`
- `/api/auth/me` 应该返回用户信息

---

### 5. 检查服务器日志

```bash
pm2 logs linklore-web --lines 100 | grep -i "cookie\|session\|auth"
```

查看是否有相关错误信息。

---

## 常见问题和解决方案

### 问题 1：域名不匹配

**现象**：访问 `mooyu.fun`，但 Cookie 域名是 `www.mooyu.fun`

**解决**：
- 统一使用 `www.mooyu.fun` 访问
- 或者在宝塔面板配置域名重定向

### 问题 2：Cookie Secure 标志

**现象**：Cookie 没有保存，控制台没有错误

**解决**：
- 确保 `COOKIE_SECURE=false` 已设置
- 重启服务：`pm2 restart linklore-web`

### 问题 3：Cookie 已保存但状态未刷新

**现象**：Cookie 存在，但页面仍显示"登录"按钮

**解决**：
- 强制刷新页面：`Ctrl + F5`
- 检查前端状态更新逻辑
- 清除 localStorage：`localStorage.clear()`

---

## 快速修复（如果 Cookie 没有保存）

### 方案 1：统一使用 www 域名

访问：`http://www.mooyu.fun/signin`

### 方案 2：修改环境变量支持两个域名

```bash
cd /www/wwwroot/linklore

# 编辑环境变量
nano apps/web/.env.production
```

修改为：
```bash
COOKIE_SECURE=false
NEXT_PUBLIC_APP_URL="http://mooyu.fun"
```

重启：
```bash
pm2 restart linklore-web
```

---

**请先检查 Cookie 是否保存，然后告诉我结果！**

