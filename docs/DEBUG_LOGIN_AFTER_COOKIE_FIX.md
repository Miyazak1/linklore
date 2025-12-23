# 调试 Cookie Domain 修复后的登录问题

## 当前状态

- ✅ Cookie Domain 已修复为 `mooyu.fun`
- ❌ 登录后仍然显示未登录状态
- ❌ 网络请求中有 `/digest?_rsc=1evot` 返回 404

## 问题分析

### 1. `/digest` 路由 404 错误

导航栏中有 `/digest` 链接，但页面不存在，导致 404。这可能会影响页面加载，但不是登录失败的直接原因。

**已修复**：已创建 `/digest` 页面。

### 2. 登录状态验证问题

登录流程：
1. 用户提交登录表单
2. `/api/auth/signin` 创建 session（Cookie）
3. 前端调用 `refreshAuth(true)` 刷新认证状态
4. `refreshAuth` 调用 `/api/auth/me` 检查登录状态
5. 如果 `/api/auth/me` 返回 `{ user: null }`，前端认为未登录

**可能的原因**：
- Cookie 虽然设置了，但在某些请求中没有被发送
- Session 读取失败（SESSION_SECRET 不匹配或其他问题）
- `/api/auth/me` 接口返回错误

---

## 诊断步骤

### 第一步：检查服务器日志

在服务器上执行：

```bash
cd /www/wwwroot/linklore

# 查看最近的 session 相关日志
pm2 logs linklore-web --lines 100 | grep -i -E "session|auth|cookie"
```

**查找以下信息**：
- `[Session] Cookie set:` - Cookie 设置成功
- `[Session] Token verified successfully` - Session 读取成功
- `[Session] No token found in cookies` - Cookie 未找到
- `[Auth Me API] Session:` - `/api/auth/me` 的 session 状态

### 第二步：测试登录 API

在浏览器控制台（F12 → Console）执行：

```javascript
// 1. 先测试登录
fetch('/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: '你的邮箱',
    password: '你的密码'
  })
})
.then(res => res.json())
.then(data => {
  console.log('登录结果:', data);
  
  // 2. 等待一下，然后测试 /api/auth/me
  setTimeout(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        console.log('登录状态:', data);
        // 如果返回 { user: null }，说明 session 读取失败
      });
  }, 500);
});
```

### 第三步：检查 Cookie 是否在请求中发送

在浏览器开发者工具（F12）：
1. **Network** 标签
2. 找到 `/api/auth/me` 请求
3. 点击查看 **Headers**
4. 检查 **Request Headers** 中是否有 `Cookie: ll_session=...`

**如果没有 Cookie**：说明 Cookie 没有被发送，可能是 Domain 或 Path 问题。

**如果有 Cookie**：但 `/api/auth/me` 仍然返回 `{ user: null }`，说明服务器端 session 读取失败。

---

## 修复方案

### 方案 1：检查并修复 SESSION_SECRET

如果 `/api/auth/me` 返回 `{ user: null }`，但 Cookie 存在，可能是 SESSION_SECRET 不匹配。

```bash
cd /www/wwwroot/linklore

# 检查 SESSION_SECRET
cat apps/web/.env.production | grep SESSION_SECRET

# 查看日志中的 SESSION_SECRET（如果之前有记录）
pm2 logs linklore-web --lines 200 | grep SESSION_SECRET
```

**如果 SESSION_SECRET 不匹配**：
1. 确保 `.env.production` 中的 `SESSION_SECRET` 正确
2. 重启服务：`pm2 restart linklore-web`
3. 清除所有 Cookie，重新登录

### 方案 2：增加等待时间

登录后，Cookie 可能需要更多时间才能在所有请求中生效。修改登录后的等待时间：

在 `apps/web/app/(auth)/signin/page.tsx` 中，增加等待时间：

```typescript
// 登录成功，等待 cookie 设置完成
await new Promise(resolve => setTimeout(resolve, 500)); // 从 100ms 增加到 500ms

// 强制刷新认证状态（跳过防抖）
try {
    await refreshAuth(true);
    // 触发全局事件，通知所有组件更新
    window.dispatchEvent(new Event('auth:changed'));
    // 再等待一下确保状态更新完成
    await new Promise(resolve => setTimeout(resolve, 500)); // 从 200ms 增加到 500ms
} catch (err) {
    log.warn('刷新认证状态失败，但登录已成功', err as Error);
}
```

### 方案 3：使用 window.location.reload() 强制刷新

如果 `refreshAuth` 失败，可以强制刷新页面：

```typescript
// 使用 window.location 强制刷新页面，确保状态同步
window.location.href = redirect;
```

改为：

```typescript
// 强制刷新页面，确保 Cookie 和状态同步
window.location.reload();
```

---

## 快速测试

### 测试 1：直接访问 /api/auth/me

在浏览器控制台执行：

```javascript
fetch('/api/auth/me')
  .then(res => res.json())
  .then(data => {
    console.log('当前登录状态:', data);
  });
```

**如果返回 `{ user: null }`**：
- 检查服务器日志，查看 session 读取失败的原因
- 检查 Cookie 是否在请求中发送

### 测试 2：检查 Cookie 属性

在浏览器开发者工具（F12）：
1. **Application** → **Cookies** → `https://mooyu.fun`
2. 找到 `ll_session` Cookie
3. 检查所有属性：
   - **Domain**: `mooyu.fun` ✅
   - **Path**: `/` ✅
   - **Secure**: `✓` ✅
   - **HttpOnly**: `✓` ✅
   - **SameSite**: `Lax` ✅

### 测试 3：检查网络请求中的 Cookie

1. **Network** 标签
2. 找到任意一个 API 请求（如 `/api/auth/me`）
3. 点击查看 **Headers**
4. 检查 **Request Headers** 中是否有 `Cookie: ll_session=...`

**如果没有 Cookie**：
- Cookie 的 Domain 或 Path 可能有问题
- 或者请求是跨域的

---

## 如果问题仍然存在

### 收集诊断信息

```bash
cd /www/wwwroot/linklore

# 1. 环境变量
cat apps/web/.env.production | grep -E "SESSION_SECRET|NEXT_PUBLIC_APP_URL|COOKIE" > /tmp/env-check.txt

# 2. 最近的 session 日志
pm2 logs linklore-web --lines 100 | grep -i -E "session|auth|cookie" > /tmp/session-logs.txt

# 3. 错误日志
tail -50 logs/web-error.log > /tmp/error-logs.txt
```

然后检查这些文件，找出问题。

---

## 常见问题

### 问题 1：Cookie 存在但 `/api/auth/me` 返回 `{ user: null }`

**可能原因**：
- SESSION_SECRET 不匹配
- Cookie 值损坏
- Session 已过期

**解决方案**：
1. 检查 SESSION_SECRET
2. 清除 Cookie，重新登录
3. 查看服务器日志，确认 session 读取失败的原因

### 问题 2：登录后立即跳转，但状态未更新

**可能原因**：
- `refreshAuth` 调用太早，Cookie 还没设置完成
- `refreshAuth` 返回了 `{ user: null }`

**解决方案**：
1. 增加等待时间（见方案 2）
2. 使用 `window.location.reload()` 强制刷新页面

### 问题 3：某些请求有 Cookie，某些没有

**可能原因**：
- Cookie 的 Path 设置不正确
- 某些请求是跨域的

**解决方案**：
1. 确保 Cookie 的 Path 是 `/`
2. 检查请求的 URL 是否在同一个域名下

