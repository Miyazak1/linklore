# 修复 Cookie 无法被服务器读取的问题

## 问题现象

从日志可以看到：
- ✅ Cookie 在浏览器中设置了（`ll_session` 存在）
- ✅ Session 创建成功：`session 创建完成`
- ❌ 服务器读取时失败：`allCookies: []` - 服务器端没有收到任何 Cookie

## 原因分析

`allCookies: []` 表示 Next.js 的 `cookies()` API 没有收到任何 Cookie。可能的原因：

1. **Next.js 15 的 cookies() API 限制**：在某些情况下，`cookies()` API 可能无法读取 Cookie
2. **Cookie 没有被浏览器发送**：虽然 Cookie 存在，但浏览器没有在请求中发送
3. **SameSite 限制**：如果请求是跨站的，`SameSite: 'lax'` 可能阻止发送 Cookie

## 解决方案

### 方案 1：使用 Request 对象直接读取（已实现）

修改 `/api/auth/me` 路由，使用 `Request` 对象直接读取 Cookie，而不是依赖 `cookies()` API：

```typescript
// 方式1：使用 cookies() API
let session = await readSession();

// 方式2：如果方式1失败，使用 Request 对象直接读取
if (!session) {
    session = await readSessionFromRequest(req);
}
```

### 方案 2：检查 Cookie 的 SameSite 设置

如果请求是跨站的，可能需要修改 SameSite 设置：

```typescript
sameSite: 'none' as const  // 允许跨站请求
```

但需要配合 `secure: true` 使用。

### 方案 3：检查请求的 Referer 和 Origin

在浏览器开发者工具中：
1. **Network** 标签
2. 找到 `/api/auth/me` 请求
3. 查看 **Headers** → **Request Headers**
4. 检查 `Referer` 和 `Origin` 是否与 Cookie 的 Domain 匹配

---

## 诊断步骤

### 第一步：检查浏览器是否发送 Cookie

在浏览器开发者工具（F12）：
1. **Network** 标签
2. 找到 `/api/auth/me` 请求
3. 点击查看 **Headers**
4. 检查 **Request Headers** 中是否有 `Cookie: ll_session=...`

**如果没有 Cookie**：
- 浏览器没有发送 Cookie
- 可能是 SameSite 或 Secure 标志问题

**如果有 Cookie**：
- 浏览器发送了 Cookie，但服务器端无法读取
- 可能是 Next.js 的 `cookies()` API 问题

### 第二步：检查 Cookie 属性

在浏览器开发者工具（F12）：
1. **Application** → **Cookies** → `https://mooyu.fun`
2. 找到 `ll_session` Cookie
3. 检查所有属性：
   - **Domain**: `mooyu.fun` ✅
   - **Path**: `/` ✅
   - **Secure**: `✓` ✅（如果使用 HTTPS）
   - **HttpOnly**: `✓` ✅
   - **SameSite**: `Lax` ⚠️（可能需要改为 `None`）

### 第三步：测试直接读取

在浏览器控制台执行：

```javascript
// 测试 /api/auth/me 接口
fetch('/api/auth/me', {
  credentials: 'include'  // 确保发送 Cookie
})
.then(res => res.json())
.then(data => {
  console.log('登录状态:', data);
});
```

---

## 如果问题仍然存在

### 临时解决方案：修改 SameSite 为 None

如果请求是跨站的，可以尝试修改 SameSite：

```typescript
sameSite: 'none' as const,
secure: true  // 必须配合 secure: true
```

但需要确保：
1. 使用 HTTPS
2. Cookie 的 Secure 标志为 true
3. 请求的 Origin 和 Referer 正确

### 检查环境变量

```bash
cd /www/wwwroot/linklore

# 检查环境变量
cat apps/web/.env.production | grep -E "NEXT_PUBLIC_APP_URL|COOKIE_SECURE|COOKIE_DOMAIN"
```

确保：
- `NEXT_PUBLIC_APP_URL="https://mooyu.fun"`
- `COOKIE_SECURE=true`
- 如果需要，设置 `COOKIE_DOMAIN=".mooyu.fun"`

---

## 验证修复

修复后，查看日志应该看到：

```
[Auth Me API] Session: { sub: '...', email: '...' }
```

而不是：

```
[Session] No token found in cookies { allCookies: [] }
```

