# 修复 Worker 构建错误

## 错误信息

```
Error: Cannot find module '/www/wwwroot/linklore/worker/ai-queue/dist/index.js'
```

## 问题原因

`linklore-worker` 进程无法启动，因为找不到编译后的文件。可能的原因：
1. Worker 的 TypeScript 代码没有被编译
2. 构建脚本没有包含 worker
3. dist 目录中的文件不是最新的

## 解决方案

### 方式1：单独构建 Worker（推荐）

在宝塔面板终端执行：

```bash
cd /www/wwwroot/linklore

# 进入 worker 目录
cd worker/ai-queue

# 安装依赖（如果需要）
pnpm install

# 构建 worker
pnpm build

# 或者使用 tsc 直接编译
tsc -p tsconfig.json

# 返回项目根目录
cd ../../

# 验证文件是否存在
ls -la worker/ai-queue/dist/index.js

# 重启 worker 进程
pm2 restart linklore-worker
```

### 方式2：在项目根目录构建

```bash
cd /www/wwwroot/linklore

# 构建 worker
cd worker/ai-queue && pnpm build && cd ../../

# 或者使用 npm script（如果有）
pnpm --filter @linklore/ai-queue build

# 重启 worker
pm2 restart linklore-worker
```

### 方式3：检查并修复路径

如果文件存在但路径不对：

```bash
cd /www/wwwroot/linklore

# 检查文件是否存在
ls -la worker/ai-queue/dist/index.js

# 如果文件不存在，构建它
cd worker/ai-queue
pnpm build
cd ../../

# 检查 ecosystem.config.js 中的路径是否正确
cat ecosystem.config.js | grep linklore-worker

# 应该看到：args: './worker/ai-queue/dist/index.js'
```

### 方式4：使用 tsx 直接运行（临时方案）

如果构建有问题，可以临时使用 tsx 直接运行 TypeScript：

修改 `ecosystem.config.js` 中的 worker 配置：

```javascript
{
    name: 'linklore-worker',
    script: 'pnpm',
    args: '--filter @linklore/ai-queue dev',  // 临时使用 dev 模式
    // 或者
    script: 'tsx',
    args: 'worker/ai-queue/index.ts',
    // ...
}
```

**注意**：这不是生产环境的推荐方式，应该先修复构建问题。

## 完整修复流程

```bash
cd /www/wwwroot/linklore

# 1. 停止所有服务
pm2 stop all

# 2. 构建 worker
cd worker/ai-queue
pnpm install  # 如果需要
pnpm build
cd ../../

# 3. 验证文件存在
if [ -f "worker/ai-queue/dist/index.js" ]; then
    echo "✓ Worker 文件存在"
else
    echo "✗ Worker 文件不存在，构建失败"
    exit 1
fi

# 4. 重新构建整个项目（确保所有依赖都正确）
pnpm build

# 5. 重启所有服务
pm2 restart ecosystem.config.js

# 6. 查看状态
pm2 status

# 7. 查看 worker 日志
pm2 logs linklore-worker --lines 20
```

## 验证修复

修复后验证：

```bash
# 1. 检查 PM2 状态
pm2 status

# 应该看到 linklore-worker 为 online

# 2. 查看 worker 日志
pm2 logs linklore-worker --lines 30

# 应该没有 MODULE_NOT_FOUND 错误

# 3. 检查文件是否存在
ls -la worker/ai-queue/dist/index.js

# 应该显示文件信息
```

## 如果仍然失败

### 检查 TypeScript 编译错误

```bash
cd worker/ai-queue

# 尝试编译并查看详细错误
tsc -p tsconfig.json --noEmit

# 或者
pnpm build
```

### 检查依赖

```bash
cd worker/ai-queue

# 检查 node_modules 是否存在
ls -la node_modules

# 如果不存在，安装依赖
pnpm install
```

### 检查路径解析

```bash
cd /www/wwwroot/linklore

# 使用绝对路径测试
node /www/wwwroot/linklore/worker/ai-queue/dist/index.js

# 如果这样可以运行，说明是相对路径问题
# 修改 ecosystem.config.js 使用绝对路径
```

## 预防措施

在部署脚本中添加 worker 构建步骤：

```bash
# 在 deploy-bt.sh 或 update-bt.sh 中添加
echo "构建 Worker..."
cd worker/ai-queue
pnpm build
cd ../../
```

---

**完成！Worker 应该可以正常启动了！**




