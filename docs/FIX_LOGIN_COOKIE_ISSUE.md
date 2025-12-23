# 修复线上登录问题：Cookie存在但登录不成功

## 问题描述

- Cookie 有记录（`ll_session` 存在）
- 点击登录后跳转回首页，但不是登录状态
- 无法新建聊天
- 本地正常，线上有问题

## 可能原因

### 1. SESSION_SECRET 不匹配（最可能）

如果服务器上的 `SESSION_SECRET` 环境变量与创建 Cookie 时的不一致，会导致：
- Cookie 存在但无法解析
- `readSession()` 返回 `null`
- 前端认为未登录

### 2. Cookie Domain 不匹配

如果访问的是 `mooyu.fun`，但 Cookie 设置了 `www.mooyu.fun` 的 domain，会导致：
- Cookie 无法读取
- 需要统一域名

### 3. Cookie Secure 标志问题

如果使用 HTTPS 但 Cookie 设置了 `secure: false`，或相反，会导致：
- Cookie 无法保存或读取
- 需要检查环境变量

### 4. 环境变量未正确加载

PM2 可能没有正确加载 `.env.production` 文件中的环境变量。

---

## 诊断步骤

### 第一步：检查服务器日志

在服务器上执行：

```bash
cd /www/wwwroot/linklore

# 查看应用日志，查找 session 相关错误
pm2 logs linklore-web --lines 100 | grep -i session

# 或查看错误日志
tail -50 logs/web-error.log | grep -i session
```

**查找以下信息**：
- `[Session] No token found in cookies` - Cookie 未找到
- `[Session] Token verification failed` - Token 验证失败（通常是 SESSION_SECRET 不匹配）

---

### 第二步：检查环境变量

```bash
cd /www/wwwroot/linklore

# 检查 SESSION_SECRET 是否设置
cat apps/web/.env.production | grep SESSION_SECRET

# 检查 COOKIE_SECURE 设置
cat apps/web/.env.production | grep COOKIE_SECURE

# 检查 NEXT_PUBLIC_APP_URL
cat apps/web/.env.production | grep NEXT_PUBLIC_APP_URL
```

**应该看到**：
```bash
SESSION_SECRET="你的密钥（至少32个字符）"
COOKIE_SECURE=true  # 如果使用 HTTPS
NEXT_PUBLIC_APP_URL="https://mooyu.fun"  # 或 "https://www.mooyu.fun"
```

---

### 第三步：测试 Session 读取

在浏览器控制台（F12 → Console）执行：

```javascript
// 测试 /api/auth/me 接口
fetch('/api/auth/me')
  .then(res => res.json())
  .then(data => {
    console.log('Auth check result:', data);
    // 如果返回 { user: null }，说明 session 读取失败
  });
```

**预期结果**：
- 如果已登录：`{ user: { id: "...", email: "..." } }`
- 如果未登录：`{ user: null }`

---

### 第四步：检查 Cookie 属性

在浏览器开发者工具（F12）：
1. **Application** → **Cookies** → `https://mooyu.fun`
2. 找到 `ll_session` Cookie
3. 检查以下属性：
   - **Domain**: 应该是 `mooyu.fun` 或 `.mooyu.fun`
   - **Path**: 应该是 `/`
   - **Secure**: 如果使用 HTTPS，应该是 `✓`
   - **HttpOnly**: 应该是 `✓`
   - **SameSite**: 应该是 `Lax`

---

## 修复方案

### 方案 1：确保 SESSION_SECRET 一致（最重要）

```bash
cd /www/wwwroot/linklore

# 1. 生成一个新的 SESSION_SECRET（如果还没有）
# 使用 openssl 生成随机密钥
openssl rand -base64 32

# 2. 编辑环境变量文件
nano apps/web/.env.production
```

添加或修改：
```bash
# 使用生成的密钥（至少32个字符）
SESSION_SECRET="你的密钥（至少32个字符，不要使用默认值）"
```

**重要**：
- 不要使用默认值 `dev-insecure-secret`
- 密钥长度至少 32 个字符
- 保存后需要重启服务

```bash
# 3. 重启服务
pm2 restart linklore-web

# 4. 清除所有 Cookie（用户需要重新登录）
# 在浏览器中清除 Cookie，或使用开发者工具删除 ll_session
```

---

### 方案 2：统一域名配置

如果访问的是 `mooyu.fun`，确保环境变量也使用 `mooyu.fun`：

```bash
cd /www/wwwroot/linklore

# 编辑环境变量
nano apps/web/.env.production
```

修改为：
```bash
NEXT_PUBLIC_APP_URL="https://mooyu.fun"
# 或
NEXT_PUBLIC_APP_URL="https://www.mooyu.fun"
```

**重要**：确保访问的域名与环境变量中的域名一致。

---

### 方案 3：修复 Cookie Secure 标志

如果使用 HTTPS：

```bash
cd /www/wwwroot/linklore

# 编辑环境变量
nano apps/web/.env.production
```

确保：
```bash
COOKIE_SECURE=true
NEXT_PUBLIC_APP_URL="https://mooyu.fun"
```

如果使用 HTTP（不推荐）：

```bash
COOKIE_SECURE=false
NEXT_PUBLIC_APP_URL="http://mooyu.fun"
```

然后重启：
```bash
pm2 restart linklore-web
```

---

### 方案 4：确保 PM2 加载环境变量

检查 PM2 是否正确加载环境变量：

```bash
cd /www/wwwroot/linklore

# 方式1：在 ecosystem.config.js 中明确指定环境变量文件
# 编辑 ecosystem.config.js，在 linklore-web 配置中添加：
# env_file: './apps/web/.env.production'

# 方式2：使用 PM2 的环境变量传递
pm2 restart linklore-web --update-env
```

或者修改 `ecosystem.config.js`：

```javascript
{
  name: 'linklore-web',
  script: 'pnpm',
  args: '--filter @linklore/web start',
  cwd: process.cwd(),
  instances: 1,
  exec_mode: 'fork',
  env_file: './apps/web/.env.production',  // 添加这一行
  env: {
    NODE_ENV: 'production',
    PORT: 3000
  },
  // ...
}
```

---

## 完整修复流程（推荐）

### 步骤 1：生成新的 SESSION_SECRET

```bash
cd /www/wwwroot/linklore

# 生成随机密钥
NEW_SECRET=$(openssl rand -base64 32)
echo "新的 SESSION_SECRET: $NEW_SECRET"
```

### 步骤 2：更新环境变量

```bash
# 编辑环境变量文件
nano apps/web/.env.production
```

添加或修改：
```bash
# 使用新生成的密钥
SESSION_SECRET="粘贴上面生成的密钥"

# 确保 Cookie 配置正确
COOKIE_SECURE=true
NEXT_PUBLIC_APP_URL="https://mooyu.fun"
```

### 步骤 3：重启服务

```bash
# 重启服务
pm2 restart linklore-web

# 查看日志确认没有错误
pm2 logs linklore-web --lines 20
```

### 步骤 4：清除 Cookie 并重新登录

1. 在浏览器中清除所有 Cookie（或只删除 `ll_session`）
2. 重新访问网站
3. 重新登录
4. 检查是否成功

---

## 验证修复

### 1. 检查服务器日志

```bash
pm2 logs linklore-web --lines 50 | grep -i session
```

应该看到：
- `[Session] Token verified successfully` - 成功
- 不应该看到 `Token verification failed` - 失败

### 2. 测试登录流程

1. 清除浏览器 Cookie
2. 访问登录页面
3. 输入账号密码登录
4. 检查是否跳转并保持登录状态
5. 刷新页面，确认仍然登录

### 3. 测试聊天功能

1. 点击新建聊天
2. 应该能正常创建聊天室

---

## 如果问题仍然存在

### 收集诊断信息

```bash
cd /www/wwwroot/linklore

# 1. 环境变量（隐藏敏感信息）
cat apps/web/.env.production | grep -v PASSWORD | grep -v SECRET > /tmp/env-check.txt

# 2. PM2 日志
pm2 logs linklore-web --lines 100 > /tmp/pm2-logs.txt

# 3. 错误日志
tail -100 logs/web-error.log > /tmp/error-logs.txt
```

然后检查这些文件，找出问题。

---

## 常见错误和解决方案

### 错误：`Token verification failed: Invalid signature`

**原因**：SESSION_SECRET 不匹配

**解决**：
1. 确保 `.env.production` 中的 `SESSION_SECRET` 正确
2. 重启服务：`pm2 restart linklore-web`
3. 清除所有 Cookie，重新登录

### 错误：Cookie 存在但无法读取

**原因**：Domain 不匹配或 Secure 标志问题

**解决**：
1. 检查访问的域名与环境变量中的域名是否一致
2. 检查 Cookie 的 Secure 标志是否正确
3. 确保使用 HTTPS 时 `COOKIE_SECURE=true`

### 错误：登录后立即退出

**原因**：前端状态未刷新

**解决**：
1. 检查 `/api/auth/me` 接口是否返回正确的用户信息
2. 检查浏览器控制台是否有错误
3. 清除 localStorage：`localStorage.clear()`

