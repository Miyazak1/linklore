# OAuth 登录快速配置指南

## 问题

访问微信/QQ登录时出现错误：`{"error": "WECHAT_APP_ID 未配置"}` 或 `{"error": "QQ_APP_ID 未配置"}`

## 解决方案

### 方案1：配置 OAuth（推荐用于生产环境）

#### 微信 OAuth 配置

1. **访问微信开放平台**：https://open.weixin.qq.com/
2. **注册并创建网站应用**
3. **获取 AppID 和 AppSecret**
4. **配置授权回调域名**（如：`your-domain.com`）

在 `apps/web/.env.local` 或 `apps/web/.env.production` 中添加：

```bash
WECHAT_APP_ID="your_wechat_app_id"
WECHAT_APP_SECRET="your_wechat_app_secret"
```

#### QQ OAuth 配置

1. **访问QQ互联**：https://connect.qq.com/
2. **注册并创建应用**
3. **获取 AppID 和 AppKey**
4. **配置授权回调域名**

在 `apps/web/.env.local` 或 `apps/web/.env.production` 中添加：

```bash
QQ_APP_ID="your_qq_app_id"
QQ_APP_KEY="your_qq_app_key"
```

#### 重启服务

配置完成后，重启开发服务器：

```bash
# 停止当前服务（Ctrl+C）
# 重新启动
pnpm dev
```

---

### 方案2：暂时禁用 OAuth 按钮（开发环境）

如果暂时不需要 OAuth 功能，可以：

1. **使用邮箱登录**：OAuth 功能是可选的，不影响邮箱登录和注册
2. **忽略错误**：点击 OAuth 按钮时会显示配置提示，但不影响其他功能

---

### 方案3：使用测试 OAuth 服务（开发环境）

开发环境可以使用测试 OAuth 服务，如：
- [OAuth 2.0 Playground](https://www.oauth.com/playground/)
- 本地 OAuth 模拟器

---

## 完整环境变量配置示例

在 `apps/web/.env.local` 中添加：

```bash
# ============================================
# 应用 URL（必需）
# ============================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ============================================
# 微信 OAuth 配置（可选）
# ============================================
WECHAT_APP_ID="your_wechat_app_id"
WECHAT_APP_SECRET="your_wechat_app_secret"

# ============================================
# QQ OAuth 配置（可选）
# ============================================
QQ_APP_ID="your_qq_app_id"
QQ_APP_KEY="your_qq_app_key"
```

---

## 验证配置

配置完成后，访问：
- 微信登录：http://localhost:3000/api/auth/oauth/wechat
- QQ登录：http://localhost:3000/api/auth/oauth/qq

如果配置正确，应该会跳转到对应的授权页面。

---

## 常见问题

### Q: 开发环境必须配置 OAuth 吗？

A: 不是必须的。OAuth 功能是可选的，不影响邮箱登录和注册功能。如果暂时不需要，可以忽略 OAuth 按钮。

### Q: 如何获取微信/QQ OAuth 参数？

A: 需要到对应的开放平台注册应用：
- 微信：https://open.weixin.qq.com/
- QQ：https://connect.qq.com/

### Q: 本地开发可以使用 OAuth 吗？

A: 可以，但需要：
1. 配置回调 URL 为 `http://localhost:3000/api/auth/oauth/callback`
2. 某些平台可能不支持 localhost，需要使用 ngrok 等工具

---

## 详细文档

更多配置说明请参考：`docs/EMAIL_OAUTH_ENV_CONFIG.md`






