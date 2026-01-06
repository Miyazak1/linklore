# 邮箱验证和OAuth登录功能实现方案

## 一、目标

1. **邮箱验证功能**：用户注册后需要验证邮箱才能激活账户
2. **微信登录**：支持微信 OAuth 登录
3. **QQ登录**：支持 QQ OAuth 登录

---

## 二、实现方案

### 1. 邮箱验证功能

#### 1.1 数据库 Schema 更新

在 `User` 模型中添加：
- `emailVerified` (Boolean): 邮箱是否已验证
- `emailVerificationToken` (String?): 邮箱验证令牌
- `emailVerificationTokenExpiresAt` (DateTime?): 验证令牌过期时间

#### 1.2 邮件发送服务

使用 `nodemailer` 库发送验证邮件，支持：
- SMTP 配置（通过环境变量）
- 邮件模板（HTML + 文本）
- 验证链接生成

#### 1.3 API 端点

- `POST /api/auth/send-verification`: 发送验证邮件
- `GET /api/auth/verify-email?token=xxx`: 验证邮箱（通过链接）

#### 1.4 注册流程更新

1. 用户注册 → 创建账户（emailVerified = false）
2. 自动发送验证邮件
3. 用户点击邮件中的验证链接
4. 验证成功后，emailVerified = true

---

### 2. 微信/QQ OAuth 登录

#### 2.1 数据库 Schema 更新

创建 `OAuthAccount` 模型：
- `id`: 主键
- `userId`: 关联用户ID
- `provider`: 提供商（'wechat' | 'qq'）
- `providerId`: 第三方平台的用户ID
- `accessToken`: 访问令牌（加密存储）
- `refreshToken`: 刷新令牌（加密存储）
- `expiresAt`: 过期时间
- `createdAt`: 创建时间

#### 2.2 OAuth 流程

1. **授权请求**：用户点击"微信登录"或"QQ登录"
2. **跳转到第三方平台**：重定向到微信/QQ授权页面
3. **回调处理**：第三方平台回调到我们的 `/api/auth/oauth/callback`
4. **获取用户信息**：使用 access_token 获取用户信息
5. **创建/关联账户**：
   - 如果 OAuth 账户已存在，直接登录
   - 如果不存在，创建新用户并关联 OAuth 账户

#### 2.3 API 端点

- `GET /api/auth/oauth/wechat`: 发起微信登录
- `GET /api/auth/oauth/qq`: 发起QQ登录
- `GET /api/auth/oauth/callback`: OAuth 回调处理

#### 2.4 环境变量

```bash
# 微信 OAuth
WECHAT_APP_ID="your_wechat_app_id"
WECHAT_APP_SECRET="your_wechat_app_secret"
WECHAT_REDIRECT_URI="https://your-domain.com/api/auth/oauth/callback?provider=wechat"

# QQ OAuth
QQ_APP_ID="your_qq_app_id"
QQ_APP_KEY="your_qq_app_key"
QQ_REDIRECT_URI="https://your-domain.com/api/auth/oauth/callback?provider=qq"

# 邮件服务
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your_email@example.com"
SMTP_PASSWORD="your_email_password"
SMTP_FROM="LinkLore <noreply@linklore.com>"
```

---

## 三、实现步骤

### 阶段1：邮箱验证功能
1. ✅ 更新数据库 Schema
2. ✅ 安装邮件发送库（nodemailer）
3. ✅ 创建邮件发送服务
4. ✅ 创建发送验证邮件 API
5. ✅ 创建验证邮箱 API
6. ✅ 更新注册流程

### 阶段2：OAuth 登录功能
1. ✅ 更新数据库 Schema
2. ✅ 创建 OAuth 服务
3. ✅ 创建微信登录 API
4. ✅ 创建 QQ 登录 API
5. ✅ 创建 OAuth 回调处理
6. ✅ 更新登录页面

---

## 四、安全考虑

1. **邮箱验证令牌**：
   - 使用随机字符串（至少32字符）
   - 设置过期时间（24小时）
   - 验证后立即删除令牌

2. **OAuth 令牌**：
   - 加密存储 access_token 和 refresh_token
   - 定期刷新令牌
   - 验证 state 参数防止 CSRF 攻击

3. **密码哈希**：
   - OAuth 用户不需要密码，passwordHash 可以为空或随机值

---

## 五、测试步骤

### 邮箱验证测试
1. 注册新账户
2. 检查是否收到验证邮件
3. 点击验证链接
4. 验证账户状态是否更新

### OAuth 登录测试
1. 点击"微信登录"按钮
2. 跳转到微信授权页面
3. 授权后回调
4. 检查是否成功登录
5. 检查 OAuth 账户是否关联

---

## 六、回退方案

如果实现过程中出现问题：
1. 数据库迁移可以回滚
2. 新功能不影响现有登录注册功能
3. 可以通过环境变量禁用新功能






