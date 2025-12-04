# 生产环境变量配置说明

## 文件位置

生产环境变量文件：`apps/web/.env.production`

## 必需变量

### 数据库配置
```bash
DATABASE_URL="postgresql://username:password@your-rds-host:5432/linklore?sslmode=require"
```
**说明**：
- 推荐使用阿里云 RDS PostgreSQL
- 如果使用本地 PostgreSQL，格式：`postgresql://postgres:password@localhost:5432/linklore`

### 会话密钥
```bash
SESSION_SECRET="your-production-secret-key-at-least-32-chars"
```
**生成方式**：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Redis 配置
```bash
REDIS_URL="redis://:password@your-redis-host:6379/0"
```
**说明**：
- 推荐使用阿里云 Redis
- 如果使用本地 Redis：`redis://127.0.0.1:6379`

### 阿里云 OSS 配置
```bash
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="your-access-key-id"
OSS_ACCESS_KEY_SECRET="your-access-key-secret"
OSS_BUCKET="your-bucket-name"
```

## 可选变量

### AI 配置
```bash
AI_DEFAULT_PROVIDER="openai"
AI_ALLOWED_PROVIDERS="openai,qwen"
AI_FALLBACK_PROVIDER="qwen"
AI_MONTHLY_USER_CAP_CENTS=500
AI_JOB_COST_LIMIT_CENTS=50
```

### 队列配置
```bash
QUEUE_CONCURRENCY=1
```

### 文件上传配置
```bash
MAX_FILE_SIZE_MB=20
ALLOWED_EXT="doc,docx,txt,md"
```

### 应用 URL（用于 Server Actions）
```bash
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Sentry 监控（可选）
```bash
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"
SENTRY_ORG="your-org"
SENTRY_PROJECT="your-project"
```

## 配置示例

完整配置示例请参考：`apps/web/.env.production.example`（如果存在）

## 安全提示

1. **不要将 `.env.production` 提交到 Git**
2. **使用强密码和密钥**
3. **定期轮换密钥**
4. **使用环境变量管理工具**（如阿里云密钥管理服务）

