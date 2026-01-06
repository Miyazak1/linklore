# 处理构建错误

## 当前问题

构建失败，主要是 TypeScript 编译错误：
- 缺少类型声明文件（`sanitize-html`, `ali-oss`）
- 缺少模块（`bullmq`, `ioredis`）
- 类型错误
- 找不到 shim 模块

**注意**：这些错误主要在 `worker/ai-queue` 中，不影响 web 应用运行。

---

## 解决方案

### 方案 1：只构建 web 应用（推荐，快速）

跳过 worker 构建，只构建 web 应用：

```bash
cd /www/wwwroot/www.linkloredu.com

# 只构建 web 应用
cd apps/web
pnpm build
```

构建成功后，启动服务：

```bash
# 回到根目录
cd ../..

# 启动服务（只启动 web，跳过 worker）
pm2 start ecosystem.config.js --env production --only linklore-web
pm2 save
pm2 startup
```

### 方案 2：安装缺少的依赖

```bash
cd /www/wwwroot/www.linkloredu.com

# 安装缺少的类型声明
pnpm add -D -w @types/sanitize-html @types/ali-oss

# 安装缺少的模块
pnpm add -w bullmq ioredis

# 重新构建
pnpm build
```

### 方案 3：修改 TypeScript 配置（放宽检查）

如果错误太多，可以修改 `worker/ai-queue/tsconfig.json`：

```bash
cd /www/wwwroot/www.linkloredu.com

# 编辑 tsconfig.json
nano worker/ai-queue/tsconfig.json
```

添加或修改：

```json
{
  "compilerOptions": {
    "noImplicitAny": false,
    "strict": false,
    "skipLibCheck": true,
    "allowJs": true
  }
}
```

### 方案 4：直接启动服务（TypeScript 错误不阻止运行）

即使构建失败，也可以尝试启动服务：

```bash
cd /www/wwwroot/www.linkloredu.com

# 直接启动服务
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 查看状态
pm2 status
```

---

## 推荐操作（快速部署）

执行以下命令，只构建 web 应用并启动服务：

```bash
cd /www/wwwroot/www.linkloredu.com && \
echo "🔨 构建 web 应用..." && \
cd apps/web && \
pnpm build && \
cd ../.. && \
echo "" && \
echo "✅ 构建完成！" && \
echo "" && \
echo "🚀 启动服务..." && \
pm2 start ecosystem.config.js --env production --only linklore-web && \
pm2 save && \
pm2 startup && \
echo "" && \
echo "✅ 服务已启动！" && \
echo "" && \
echo "📊 查看服务状态：" && \
pm2 status
```

---

## 如果 web 应用构建也失败

### 安装缺少的依赖

```bash
cd /www/wwwroot/www.linkloredu.com/apps/web

# 安装缺少的类型声明
pnpm add -D @types/sanitize-html @types/ali-oss

# 安装缺少的模块
pnpm add bullmq ioredis

# 重新构建
pnpm build
```

---

## 验证部署

### 1. 检查 PM2 状态

```bash
pm2 status
```

应该至少看到 `linklore-web` 在运行。

### 2. 访问网站

- 打开浏览器
- 访问：`https://www.linkloredu.com`
- 应该能看到网站首页

### 3. 查看日志

```bash
pm2 logs linklore-web
```

---

## 重要提示

1. **TypeScript 错误不阻止运行**：即使构建失败，应用也可能正常运行
2. **Worker 不是必需的**：如果只是测试，可以先不运行 worker
3. **后续修复**：可以后续再修复 TypeScript 错误

---

## 下一步

先执行推荐操作（只构建 web 应用），然后启动服务。完成后告诉我结果。





















