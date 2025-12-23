# 修复 Cookie Domain 不匹配问题

## 问题确认

- **访问的域名**：`mooyu.fun`（无 www）
- **Cookie 的 Domain**：`www.mooyu.fun`（有 www）
- **结果**：Cookie 无法在 `mooyu.fun` 下读取，导致登录失败

## 原因

Next.js 的 `cookies()` API 默认会根据请求的 Host header 设置 Cookie domain。如果：
- 环境变量 `NEXT_PUBLIC_APP_URL` 设置为 `www.mooyu.fun`
- 或者某些请求的 Host 是 `www.mooyu.fun`

Cookie 就会被设置为 `www.mooyu.fun` 的 domain，在 `mooyu.fun` 下无法读取。

---

## 解决方案

### 方案 1：统一使用 mooyu.fun（推荐）

这是最简单的方案，确保所有访问都使用 `mooyu.fun`。

#### 步骤 1：修改环境变量

在服务器上执行：

```bash
cd /www/wwwroot/linklore

# 编辑环境变量
nano apps/web/.env.production
```

修改为：
```bash
NEXT_PUBLIC_APP_URL="https://mooyu.fun"
COOKIE_SECURE=true
```

#### 步骤 2：配置 nginx 重定向

在宝塔面板中：
1. **网站** → 找到你的网站 → **设置**
2. **配置文件** 标签
3. 添加以下配置，将 `www.mooyu.fun` 重定向到 `mooyu.fun`：

```nginx
# 重定向 www 到非 www
server {
    listen 443 ssl http2;
    server_name www.mooyu.fun;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    return 301 https://mooyu.fun$request_uri;
}

server {
    listen 80;
    server_name www.mooyu.fun;
    return 301 https://mooyu.fun$request_uri;
}
```

#### 步骤 3：重启服务

```bash
# 重启 PM2 服务
pm2 restart linklore-web

# 重启 nginx
nginx -t  # 检查配置
nginx -s reload  # 或 systemctl reload nginx
```

#### 步骤 4：清除 Cookie 并重新登录

1. 在浏览器中清除所有 Cookie（或只删除 `ll_session`）
2. 访问 `https://mooyu.fun`
3. 重新登录
4. 检查 Cookie 的 Domain 应该是 `mooyu.fun`

---

### 方案 2：设置 Cookie Domain 为 `.mooyu.fun`（支持两个域名）

如果需要同时支持 `mooyu.fun` 和 `www.mooyu.fun`，可以设置 Cookie Domain 为 `.mooyu.fun`（注意前面的点）。

#### 步骤 1：设置环境变量

```bash
cd /www/wwwroot/linklore

# 编辑环境变量
nano apps/web/.env.production
```

添加：
```bash
# 设置 Cookie Domain 为 .mooyu.fun（支持 mooyu.fun 和 www.mooyu.fun）
COOKIE_DOMAIN=".mooyu.fun"
COOKIE_SECURE=true
NEXT_PUBLIC_APP_URL="https://mooyu.fun"
```

**注意**：我已经更新了代码，支持通过 `COOKIE_DOMAIN` 环境变量设置 Cookie domain。

#### 步骤 2：重启服务

```bash
# 重启服务
pm2 restart linklore-web

# 查看日志确认
pm2 logs linklore-web --lines 20 | grep -i cookie
```

应该看到：
```
[Session] Cookie set: { domain: '.mooyu.fun', ... }
```

#### 步骤 3：清除 Cookie 并重新登录

1. 在浏览器中清除所有 Cookie
2. 访问 `https://mooyu.fun` 或 `https://www.mooyu.fun`
3. 重新登录
4. 检查 Cookie 的 Domain 应该是 `.mooyu.fun`

---

## 验证修复

### 1. 检查 Cookie Domain

在浏览器开发者工具（F12）：
1. **Application** → **Cookies** → 展开你的域名
2. 找到 `ll_session` Cookie
3. 查看 **Domain** 列

**方案 1**：应该是 `mooyu.fun`
**方案 2**：应该是 `.mooyu.fun`

### 2. 测试登录

1. 清除所有 Cookie
2. 访问网站
3. 登录
4. 刷新页面
5. 确认登录状态保持

### 3. 测试跨域名（如果使用方案 2）

1. 在 `mooyu.fun` 登录
2. 访问 `www.mooyu.fun`
3. 确认仍然登录（如果 Cookie Domain 是 `.mooyu.fun`）

---

## 推荐方案

**推荐使用方案 1**（统一使用 `mooyu.fun`），因为：
- 更简单，不需要设置 Cookie Domain
- SEO 更好（避免重复内容）
- 用户体验更好（统一的域名）

如果必须支持两个域名，使用方案 2。

---

## 如果问题仍然存在

### 检查环境变量是否正确加载

```bash
cd /www/wwwroot/linklore

# 检查环境变量
cat apps/web/.env.production | grep -E "NEXT_PUBLIC_APP_URL|COOKIE_DOMAIN|COOKIE_SECURE"

# 检查 PM2 是否加载了环境变量
pm2 env linklore-web | grep -E "NEXT_PUBLIC_APP_URL|COOKIE_DOMAIN|COOKIE_SECURE"
```

### 查看日志

```bash
pm2 logs linklore-web --lines 50 | grep -i "cookie\|session"
```

应该看到：
- `[Session] Cookie set: { domain: '...', ... }` - Cookie 设置信息

### 检查 nginx 配置

确保 nginx 正确配置了域名重定向（如果使用方案 1）。

