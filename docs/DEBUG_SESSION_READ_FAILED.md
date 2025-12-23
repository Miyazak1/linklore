# 调试 Session 读取失败问题

## 当前情况

- Cookie `ll_session` 已保存
- 但 `/api/auth/me` 返回 `{ user: null }`
- 前端状态没有刷新

---

## 可能的原因

1. **SESSION_SECRET 不匹配** - 创建 Cookie 时使用的 secret 和读取时使用的 secret 不一致
2. **Token 过期** - JWT token 已过期
3. **Token 格式错误** - Token 被损坏或格式不正确
4. **Cookie 域名问题** - Cookie 在错误的域名下

---

## 调试步骤

### 1. 检查服务器日志

```bash
pm2 logs linklore-web --lines 100
```

查找：
- `[Session] Token verification failed` - Token 验证失败
- `[Session] No token found in cookies` - 没有找到 Cookie
- `[Auth Me API] Session:` - Session 读取结果
- `[Auth Me API] No session or no sub` - Session 为空

### 2. 检查 SESSION_SECRET

```bash
cd /www/wwwroot/linklore

# 检查环境变量
cat apps/web/.env.production | grep SESSION_SECRET

# 如果没有，生成一个
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**重要**：确保 `SESSION_SECRET` 在创建 Cookie 和读取 Cookie 时是同一个值！

### 3. 检查 Cookie 内容

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
console.log('ll_session:', cookies.ll_session ? cookies.ll_session.substring(0, 50) + '...' : '不存在');
```

### 4. 测试 Session 读取

在浏览器控制台执行：

```javascript
// 测试 /api/auth/me
fetch('/api/auth/me')
  .then(res => res.json())
  .then(data => {
    console.log('认证状态:', data);
    if (data.user) {
      console.log('✓ 已登录');
    } else {
      console.log('✗ 未登录');
    }
  });
```

---

## 常见问题和解决方案

### 问题 1：SESSION_SECRET 不匹配

**现象**：日志显示 `Token verification failed`

**解决**：
1. 检查 `.env.production` 中的 `SESSION_SECRET`
2. 确保创建 Cookie 和读取 Cookie 时使用同一个 secret
3. 如果修改了 secret，需要清除所有 Cookie 并重新登录

### 问题 2：Token 过期

**现象**：日志显示 `Token expired`

**解决**：
- Token 有效期是 7 天
- 如果过期，需要重新登录

### 问题 3：Cookie 域名不匹配

**现象**：Cookie 在 `www.mooyu.fun` 下，但访问的是 `mooyu.fun`

**解决**：
- 统一使用 `www.mooyu.fun` 访问
- 或者在宝塔面板配置域名重定向

---

## 快速修复

### 方案 1：重新生成 SESSION_SECRET

```bash
cd /www/wwwroot/linklore

# 生成新的 secret
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "新 SESSION_SECRET: $NEW_SECRET"

# 编辑环境变量
nano apps/web/.env.production
```

添加或修改：
```bash
SESSION_SECRET="生成的随机字符串"
```

保存后重启：
```bash
pm2 restart linklore-web
```

**注意**：修改 secret 后，所有用户需要重新登录！

### 方案 2：清除所有 Cookie 并重新登录

在浏览器控制台执行：

```javascript
// 清除所有 Cookie
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});

// 清除存储
localStorage.clear();
sessionStorage.clear();

// 刷新页面
location.reload();
```

然后重新登录。

---

## 检查清单

- [ ] Cookie `ll_session` 已保存
- [ ] `SESSION_SECRET` 环境变量已设置
- [ ] 服务器日志没有错误
- [ ] `/api/auth/me` 返回用户信息
- [ ] 使用统一的域名访问（www 或非 www）

---

**请检查服务器日志，告诉我看到了什么错误信息！**




