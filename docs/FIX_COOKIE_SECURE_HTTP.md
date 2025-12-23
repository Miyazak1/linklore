# 修复 HTTP 环境下 Cookie 无法保存的问题

## 问题

使用 HTTP（非 HTTPS）访问时，如果 Cookie 的 `secure` 标志设置为 `true`，浏览器会拒绝保存 Cookie，导致登录后无法保持登录状态。

---

## 解决方案

已修复 `apps/web/lib/auth/session.ts`，现在会根据以下规则判断是否使用 `secure` Cookie：

1. **环境变量 `COOKIE_SECURE`**：如果设置了，直接使用该值
2. **`NEXT_PUBLIC_APP_URL`**：如果 URL 是 `https://`，使用 `secure: true`
3. **开发环境**：默认 `secure: false`（允许 HTTP）
4. **生产环境**：默认 `secure: false`（如果使用 HTTP，需要设置环境变量）

---

## 在服务器上配置

### 如果使用 HTTP（未配置 SSL）

在 `apps/web/.env.production` 中添加或修改：

```bash
# 明确指定不使用 secure cookie（因为使用 HTTP）
COOKIE_SECURE=false

# 或者设置应用 URL（如果使用 HTTP）
NEXT_PUBLIC_APP_URL="http://www.mooyu.fun"
```

### 如果使用 HTTPS（已配置 SSL）

在 `apps/web/.env.production` 中：

```bash
# 明确指定使用 secure cookie
COOKIE_SECURE=true

# 或者设置应用 URL（如果使用 HTTPS）
NEXT_PUBLIC_APP_URL="https://www.mooyu.fun"
```

---

## 快速修复（HTTP 环境）

在服务器上执行：

```bash
cd /www/wwwroot/linklore

# 编辑环境变量文件
nano apps/web/.env.production
```

添加或修改：

```bash
COOKIE_SECURE=false
NEXT_PUBLIC_APP_URL="http://www.mooyu.fun"
```

保存后重启服务：

```bash
pm2 restart linklore-web
```

---

## 验证

1. 清除浏览器 Cookie 和缓存
2. 访问：`http://www.mooyu.fun/signin`
3. 登录
4. **预期结果**：
   - 登录成功
   - 页面刷新后仍然保持登录状态
   - 右上角显示用户信息

---

## 检查 Cookie 是否保存

打开浏览器开发者工具（F12）：
1. **Application** → **Cookies** → `http://www.mooyu.fun`
2. 应该看到 `ll_session` Cookie
3. 检查 `Secure` 列：如果使用 HTTP，应该是 `false`

---

**完成！现在 HTTP 环境下 Cookie 应该可以正常保存了！**




