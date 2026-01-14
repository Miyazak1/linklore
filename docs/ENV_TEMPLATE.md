# .env 环境变量配置文件模板

## 完整配置模板

在项目根目录创建 `.env` 文件，复制以下内容：

```bash
# ============================================
# LinkLore 生产环境变量配置文件
# ============================================

# ============================================
# PostgreSQL 数据库配置
# ============================================
POSTGRES_DB=linklore
POSTGRES_USER=linklore_user
POSTGRES_PASSWORD=请设置强密码（至少16位）

# ============================================
# Redis 配置
# ============================================
REDIS_PASSWORD=你的Redis密码（可选）

# ============================================
# 会话密钥（必需，至少32字符）
# ============================================
SESSION_SECRET=请生成32位随机字符串

# ============================================
# 阿里云 OSS 配置（必需）
# ============================================
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=你的AccessKey ID
OSS_ACCESS_KEY_SECRET=你的AccessKey Secret
OSS_BUCKET=你的Bucket名称

# ============================================
# AI 配置
# ============================================
AI_DEFAULT_PROVIDER=openai
AI_ALLOWED_PROVIDERS=openai,qwen
AI_FALLBACK_PROVIDER=qwen
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50

# ============================================
# 队列配置
# ============================================
QUEUE_CONCURRENCY=1

# ============================================
# 文件上传配置
# ============================================
MAX_FILE_SIZE_MB=20
ALLOWED_EXT=doc,docx,txt,md

# ============================================
# 生产环境配置
# ============================================
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 配置说明

### 必需配置项

1. **POSTGRES_PASSWORD** - 数据库密码（至少16位）
2. **SESSION_SECRET** - 会话密钥（至少32字符）
3. **OSS_ACCESS_KEY_ID** - 阿里云 OSS AccessKey ID
4. **OSS_ACCESS_KEY_SECRET** - 阿里云 OSS AccessKey Secret
5. **OSS_BUCKET** - 阿里云 OSS Bucket 名称
6. **NEXT_PUBLIC_APP_URL** - 应用域名（HTTPS）

### 可选配置项

- **REDIS_PASSWORD** - Redis 密码（建议设置）
- **OSS_REGION** - OSS 地域（默认：oss-cn-hangzhou）
- **AI_*** - AI 相关配置（可根据需求调整）

## 生成 SESSION_SECRET

在终端执行：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 配置检查清单

- [ ] POSTGRES_PASSWORD 已设置（至少16位）
- [ ] SESSION_SECRET 已生成（至少32位）
- [ ] OSS_ACCESS_KEY_ID 已填写
- [ ] OSS_ACCESS_KEY_SECRET 已填写
- [ ] OSS_BUCKET 已填写
- [ ] NEXT_PUBLIC_APP_URL 已替换为实际域名
- [ ] REDIS_PASSWORD 已设置（如使用密码）

