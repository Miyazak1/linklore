# 修复 Cookie 创建成功但读取失败的问题

## 问题现象

从日志可以看到：
- ✅ Session 创建成功：`session 创建完成`
- ❌ 读取时经常失败：`[Session] No token found in cookies`
- ❌ 偶尔成功：说明 Cookie 有时能读取到，有时不能

## 可能原因

### 1. Cookie Domain 不匹配（最可能）

如果访问的是 `mooyu.fun`，但某些请求来自 `www.mooyu.fun`（或相反），Cookie 可能无法共享。

**Next.js 默认行为**：如果不指定 `domain`，Cookie 会使用当前请求的域名。如果访问 `mooyu.fun`，Cookie 的 domain 就是 `mooyu.fun`，在 `www.mooyu.fun` 下无法读取。

### 2. Cookie 在某些请求中没有被发送

可能的原因：
- 跨域请求
- SameSite 限制
- Secure 标志不匹配

### 3. 多个 Cookie 实例

如果创建和读取时使用了不同的 Cookie 实例，可能导致读取失败。

---

## 解决方案

### 方案 1：统一域名（推荐）

确保所有访问都使用同一个域名：

1. **如果使用 `mooyu.fun`**：
   - 确保环境变量：`NEXT_PUBLIC_APP_URL="https://mooyu.fun"`
   - 在 nginx 配置中，将 `www.mooyu.fun` 重定向到 `mooyu.fun`

2. **如果使用 `www.mooyu.fun`**：
   - 确保环境变量：`NEXT_PUBLIC_APP_URL="https://www.mooyu.fun"`
   - 在 nginx 配置中，将 `mooyu.fun` 重定向到 `www.mooyu.fun`

### 方案 2：设置 Cookie Domain（如果需要支持两个域名）

如果需要同时支持 `mooyu.fun` 和 `www.mooyu.fun`，可以设置 Cookie Domain 为 `.mooyu.fun`（注意前面的点）。

**注意**：Next.js 的 `cookies()` API 不支持直接设置 `domain`，需要通过 Response Headers 手动设置。

### 方案 3：检查并修复环境变量

```bash
cd /www/wwwroot/linklore

# 检查当前配置
cat apps/web/.env.production | grep NEXT_PUBLIC_APP_URL

# 确保域名与实际访问的域名一致
# 如果访问的是 mooyu.fun，设置为：
NEXT_PUBLIC_APP_URL="https://mooyu.fun"

# 如果访问的是 www.mooyu.fun，设置为：
NEXT_PUBLIC_APP_URL="https://www.mooyu.fun"
```

---

## 诊断步骤

### 第一步：检查实际访问的域名

在浏览器中：
1. 打开开发者工具（F12）
2. 查看 **Network** 标签
3. 刷新页面
4. 查看请求的 URL，确认是 `mooyu.fun` 还是 `www.mooyu.fun`

### 第二步：检查 Cookie Domain

在浏览器中：
1. 打开开发者工具（F12）
2. **Application** → **Cookies** → 展开你的域名
3. 找到 `ll_session` Cookie
4. 查看 **Domain** 列，确认是 `mooyu.fun` 还是 `www.mooyu.fun`

**如果 Domain 是 `mooyu.fun`，但访问的是 `www.mooyu.fun`（或相反），这就是问题所在。**

### 第三步：检查环境变量

```bash
cd /www/wwwroot/linklore

# 检查环境变量
cat apps/web/.env.production | grep NEXT_PUBLIC_APP_URL
```

**确保环境变量中的域名与实际访问的域名一致。**

### 第四步：查看详细日志

重启服务后，查看日志：

```bash
pm2 restart linklore-web
pm2 logs linklore-web --lines 50 | grep -i session
```

现在日志会显示所有 Cookie 的名称，帮助诊断问题。

---

## 快速修复（推荐）

### 如果访问的是 `mooyu.fun`（无 www）

```bash
cd /www/wwwroot/linklore

# 编辑环境变量
nano apps/web/.env.production
```

确保：
```bash
NEXT_PUBLIC_APP_URL="https://mooyu.fun"
COOKIE_SECURE=true
```

然后：
```bash
# 重启服务
pm2 restart linklore-web

# 在 nginx 配置中，将 www.mooyu.fun 重定向到 mooyu.fun
# 在宝塔面板中：网站 → 设置 → 配置文件
# 添加：
# server {
#     listen 443 ssl;
#     server_name www.mooyu.fun;
#     return 301 https://mooyu.fun$request_uri;
# }
```

### 如果访问的是 `www.mooyu.fun`（有 www）

```bash
cd /www/wwwroot/linklore

# 编辑环境变量
nano apps/web/.env.production
```

确保：
```bash
NEXT_PUBLIC_APP_URL="https://www.mooyu.fun"
COOKIE_SECURE=true
```

然后：
```bash
# 重启服务
pm2 restart linklore-web

# 在 nginx 配置中，将 mooyu.fun 重定向到 www.mooyu.fun
# 在宝塔面板中：网站 → 设置 → 配置文件
# 添加：
# server {
#     listen 443 ssl;
#     server_name mooyu.fun;
#     return 301 https://www.mooyu.fun$request_uri;
# }
```

---

## 验证修复

### 1. 清除所有 Cookie

在浏览器中清除所有 Cookie（或只删除 `ll_session`）。

### 2. 重新登录

1. 访问网站（确保使用统一的域名）
2. 登录
3. 检查 Cookie 的 Domain 是否正确

### 3. 测试多个页面

1. 登录后，访问不同页面
2. 刷新页面
3. 确认登录状态保持

### 4. 查看日志

```bash
pm2 logs linklore-web --lines 50 | grep -i session
```

应该看到：
- `[Session] Cookie set:` - Cookie 设置成功
- `[Session] Token verified successfully` - 读取成功
- 不应该看到 `No token found in cookies`（除非真的没有 Cookie）

---

## 如果问题仍然存在

### 收集诊断信息

```bash
cd /www/wwwroot/linklore

# 1. 环境变量
cat apps/web/.env.production | grep -E "NEXT_PUBLIC_APP_URL|COOKIE_SECURE" > /tmp/env-check.txt

# 2. 最近的 session 日志
pm2 logs linklore-web --lines 100 | grep -i session > /tmp/session-logs.txt

# 3. nginx 配置（检查域名重定向）
cat /www/server/panel/vhost/nginx/你的网站.conf | grep -i server_name > /tmp/nginx-domain.txt
```

然后检查这些文件，找出域名不匹配的问题。

