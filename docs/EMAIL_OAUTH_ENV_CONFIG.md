# 邮箱验证和OAuth登录环境变量配置

## 必需的环境变量

### 邮件服务配置（邮箱验证功能）

在 `apps/web/.env.production` 或 `apps/web/.env.local` 中添加：

```bash
# SMTP 邮件服务器配置
SMTP_HOST="smtp.example.com"          # SMTP服务器地址（如：smtp.qq.com, smtp.gmail.com）
SMTP_PORT=587                          # SMTP端口（587 或 465）
SMTP_USER="your_email@example.com"     # SMTP用户名（通常是邮箱地址）
SMTP_PASSWORD="your_email_password"    # SMTP密码（可能是应用专用密码）
SMTP_SECURE="false"                    # 是否使用SSL（465端口通常为true，587为false）
SMTP_FROM="LinkLore <noreply@linklore.com>"  # 发件人地址和名称
```

#### 常用邮件服务商配置示例

**QQ邮箱：**
```bash
SMTP_HOST="smtp.qq.com"
SMTP_PORT=587
SMTP_USER="your_qq@qq.com"
SMTP_PASSWORD="your_qq_email_auth_code"  # 需要在QQ邮箱设置中生成授权码
SMTP_SECURE="false"
SMTP_FROM="LinkLore <your_qq@qq.com>"
```

**Gmail：**
```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASSWORD="your_app_password"  # 需要使用应用专用密码
SMTP_SECURE="false"
SMTP_FROM="LinkLore <your_email@gmail.com>"
```

**163邮箱：**
```bash
SMTP_HOST="smtp.163.com"
SMTP_PORT=465
SMTP_USER="your_email@163.com"
SMTP_PASSWORD="your_163_email_auth_code"
SMTP_SECURE="true"
SMTP_FROM="LinkLore <your_email@163.com>"
```

---

### 微信 OAuth 配置

```bash
# 微信开放平台配置
WECHAT_APP_ID="your_wechat_app_id"                    # 微信开放平台 AppID
WECHAT_APP_SECRET="your_wechat_app_secret"            # 微信开放平台 AppSecret
```

**获取方式：**
1. 访问 [微信开放平台](https://open.weixin.qq.com/)
2. 注册并创建网站应用
3. 获取 AppID 和 AppSecret
4. 配置授权回调域名（如：`your-domain.com`）

---

### QQ OAuth 配置

```bash
# QQ互联配置
QQ_APP_ID="your_qq_app_id"              # QQ互联 AppID
QQ_APP_KEY="your_qq_app_key"            # QQ互联 AppKey
```

**获取方式：**
1. 访问 [QQ互联](https://connect.qq.com/)
2. 注册并创建应用
3. 获取 AppID 和 AppKey
4. 配置授权回调域名（如：`your-domain.com`）

---

## 完整配置示例

```bash
# ============================================
# 邮件服务配置（邮箱验证）
# ============================================
SMTP_HOST="smtp.qq.com"
SMTP_PORT=587
SMTP_USER="noreply@yourdomain.com"
SMTP_PASSWORD="your_smtp_password"
SMTP_SECURE="false"
SMTP_FROM="LinkLore <noreply@yourdomain.com>"

# ============================================
# 微信 OAuth 配置
# ============================================
WECHAT_APP_ID="wx1234567890abcdef"
WECHAT_APP_SECRET="your_wechat_app_secret_here"

# ============================================
# QQ OAuth 配置
# ============================================
QQ_APP_ID="101234567"
QQ_APP_KEY="your_qq_app_key_here"

# ============================================
# 应用 URL（必需，用于生成验证链接和OAuth回调）
# ============================================
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

---

## 注意事项

1. **邮件服务**：
   - 某些邮件服务商需要使用"应用专用密码"而不是普通密码
   - 确保 SMTP 服务已启用
   - 测试环境可以使用 [Mailtrap](https://mailtrap.io/) 等测试服务

2. **OAuth 配置**：
   - 回调 URL 必须与配置的授权回调域名匹配
   - 生产环境必须使用 HTTPS
   - 妥善保管 AppSecret 和 AppKey，不要泄露

3. **安全建议**：
   - 使用环境变量管理敏感信息
   - 定期轮换密钥
   - 使用强密码和应用专用密码

---

## 测试步骤

### 邮箱验证测试
1. 配置 SMTP 环境变量
2. 注册新账户
3. 检查邮箱是否收到验证邮件
4. 点击验证链接
5. 验证账户状态是否更新

### OAuth 登录测试
1. 配置微信/QQ OAuth 环境变量
2. 点击"微信登录"或"QQ登录"按钮
3. 完成授权
4. 验证是否成功登录
5. 检查 OAuth 账户是否关联






