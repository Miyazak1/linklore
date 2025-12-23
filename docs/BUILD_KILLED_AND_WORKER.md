# 构建被 Killed 和 Worker 问题

## 当前问题

构建过程中出现 `Killed` 错误，这通常是因为**内存不足**。

你的服务器是 **2核4GB**，Next.js 构建可能需要更多内存。

---

## 关于 Worker

### Worker 不是必需的

**Worker** (`linklore-worker`) 主要用于：
- AI 任务队列处理
- 后台任务处理

**对于基本功能**：
- Web 应用可以正常运行
- 聊天功能可以正常使用
- 只是 AI 相关功能可能受影响

**建议**：
- **可以先不构建和运行 worker**
- **只运行 web 应用**
- **后续需要时再修复 worker**

---

## 解决方案

### 方案 1：增加 Swap 空间（推荐）

增加虚拟内存，避免内存不足：

```bash
# 检查当前 swap
free -h

# 创建 4GB swap（如果还没有）
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久启用
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 验证
free -h
```

然后重新构建：

```bash
cd /www/wwwroot/www.linkloredu.com/apps/web
pnpm build
```

### 方案 2：跳过 Worker，只构建 Web（快速）

```bash
cd /www/wwwroot/www.linkloredu.com

# 只构建 web 应用
cd apps/web
pnpm build

# 如果构建成功，启动服务（只启动 web）
cd ../..
pm2 start ecosystem.config.js --env production --only linklore-web
pm2 save
pm2 startup
```

### 方案 3：修改构建配置（减少内存使用）

修改 `apps/web/next.config.mjs`，添加：

```javascript
const nextConfig = {
  // ... 其他配置
  experimental: {
    // 减少内存使用
    optimizeCss: false,
  },
  // 减少并发构建
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
    }
    return config;
  },
};
```

---

## 推荐操作流程

### 第一步：增加 Swap 空间

```bash
# 检查当前 swap
free -h

# 如果 swap 小于 2GB，创建 4GB swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 验证
free -h
```

### 第二步：重新构建 Web 应用

```bash
cd /www/wwwroot/www.linkloredu.com/apps/web
pnpm build
```

### 第三步：启动服务（只启动 Web）

```bash
cd /www/wwwroot/www.linkloredu.com

# 只启动 web 应用
pm2 start ecosystem.config.js --env production --only linklore-web
pm2 save
pm2 startup

# 查看状态
pm2 status
```

---

## 关于 Worker 的后续处理

### 如果不需要 AI 功能

- **可以暂时不运行 worker**
- **Web 应用可以正常使用**
- **后续需要时再修复**

### 如果需要 AI 功能

1. **先修复 TypeScript 错误**：
   - 安装缺少的类型声明
   - 修复类型错误
   - 修复模块导入问题

2. **然后构建 worker**：
   ```bash
   cd /www/wwwroot/www.linkloredu.com/worker/ai-queue
   pnpm build
   ```

3. **启动 worker**：
   ```bash
   pm2 start ecosystem.config.js --env production --only linklore-worker
   ```

---

## 快速操作（推荐）

执行以下命令，增加 swap 并重新构建：

```bash
# 1. 增加 swap
echo "📦 增加 Swap 空间..." && \
sudo fallocate -l 4G /swapfile && \
sudo chmod 600 /swapfile && \
sudo mkswap /swapfile && \
sudo swapon /swapfile && \
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab && \
echo "✅ Swap 已增加" && \
free -h && \
echo "" && \
# 2. 重新构建
echo "🔨 重新构建 web 应用..." && \
cd /www/wwwroot/www.linkloredu.com/apps/web && \
pnpm build && \
cd ../.. && \
echo "" && \
echo "✅ 构建完成！" && \
# 3. 启动服务
echo "🚀 启动服务..." && \
pm2 start ecosystem.config.js --env production --only linklore-web && \
pm2 save && \
pm2 startup && \
echo "" && \
echo "✅ 服务已启动！" && \
pm2 status
```

---

## 重要提示

1. **Worker 不是必需的**：可以先不运行，Web 应用可以正常使用
2. **内存不足**：增加 swap 空间可以解决构建被 killed 的问题
3. **后续修复**：可以后续再修复 worker 的 TypeScript 错误

---

## 下一步

先执行增加 swap 和重新构建的命令。完成后告诉我结果。















