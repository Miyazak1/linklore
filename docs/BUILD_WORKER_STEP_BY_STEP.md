# 构建 Worker 详细步骤

## 问题
- `dist/index.js` 文件不存在
- 需要在正确的目录下执行命令
- 需要确保 TypeScript 已安装

## 完整修复步骤

### 步骤 1：切换到项目目录

```bash
# 确保在项目根目录
cd /www/wwwroot/linklore

# 验证当前位置
pwd
# 应该显示：/www/wwwroot/linklore
```

### 步骤 2：检查 worker 目录是否存在

```bash
# 检查目录结构
ls -la worker/ai-queue/

# 应该看到：
# - index.ts
# - package.json
# - tsconfig.json
# - dist/ (可能为空或不存在)
```

### 步骤 3：进入 worker 目录并构建

```bash
# 进入 worker 目录
cd worker/ai-queue

# 检查 package.json 是否存在
ls -la package.json

# 安装依赖（如果需要）
pnpm install

# 构建 worker
pnpm build

# 或者如果 pnpm build 失败，直接使用 tsc
# 但需要先确保 TypeScript 已安装
```

### 步骤 4：如果 tsc 命令找不到

```bash
# 在 worker 目录下，使用 pnpm 运行 tsc
pnpm exec tsc -p tsconfig.json

# 或者安装 TypeScript（如果全局没有）
pnpm add -D typescript

# 然后构建
pnpm build
```

### 步骤 5：验证文件生成

```bash
# 检查文件是否存在
ls -la dist/index.js

# 如果存在，应该看到文件信息
# 如果不存在，查看构建错误
```

### 步骤 6：返回根目录并重启服务

```bash
# 返回项目根目录
cd /www/wwwroot/linklore

# 验证完整路径
ls -la worker/ai-queue/dist/index.js

# 停止 worker
pm2 stop linklore-worker

# 重启 worker
pm2 restart linklore-worker

# 查看状态
pm2 status

# 查看日志
pm2 logs linklore-worker --lines 20
```

## 一键修复脚本

创建并执行以下脚本：

```bash
cd /www/wwwroot/linklore

cat > build-worker.sh << 'EOF'
#!/bin/bash
set -e

echo "=========================================="
echo "构建 Worker"
echo "=========================================="

# 确保在项目根目录
cd /www/wwwroot/linklore

# 进入 worker 目录
cd worker/ai-queue

echo "[1/4] 检查目录..."
if [ ! -f "package.json" ]; then
    echo "错误：找不到 package.json"
    exit 1
fi

echo "[2/4] 安装依赖..."
pnpm install

echo "[3/4] 构建 worker..."
pnpm build

echo "[4/4] 验证文件..."
if [ -f "dist/index.js" ]; then
    echo "✓ dist/index.js 已生成"
    ls -lh dist/index.js
else
    echo "✗ 构建失败，文件不存在"
    echo "尝试使用 tsc 直接编译..."
    pnpm exec tsc -p tsconfig.json
    if [ -f "dist/index.js" ]; then
        echo "✓ 使用 tsc 编译成功"
    else
        echo "✗ 编译失败，请检查错误信息"
        exit 1
    fi
fi

# 返回根目录
cd /www/wwwroot/linklore

echo ""
echo "=========================================="
echo "构建完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 重启 worker: pm2 restart linklore-worker"
echo "2. 查看状态: pm2 status"
echo "3. 查看日志: pm2 logs linklore-worker --lines 20"
EOF

# 添加执行权限
chmod +x build-worker.sh

# 运行脚本
./build-worker.sh
```

## 如果构建仍然失败

### 检查 TypeScript 配置

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 查看 tsconfig.json
cat tsconfig.json

# 检查是否有语法错误
```

### 查看详细错误

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 使用 pnpm 运行 tsc 并查看详细输出
pnpm exec tsc -p tsconfig.json --listFiles 2>&1 | head -50
```

### 检查依赖

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 检查 node_modules
ls -la node_modules | head -20

# 如果没有 node_modules，安装依赖
pnpm install
```

## 临时方案：使用 tsx 直接运行（不推荐生产环境）

如果构建一直失败，可以临时使用 tsx 直接运行 TypeScript：

```bash
cd /www/wwwroot/linklore

# 编辑 ecosystem.config.js
nano ecosystem.config.js
```

修改 worker 配置：

```javascript
{
    name: 'linklore-worker',
    script: 'tsx',  // 使用 tsx
    args: 'worker/ai-queue/index.ts',  // 直接运行 TypeScript
    // ...
}
```

然后：
```bash
# 安装 tsx（如果还没有）
pnpm add -g tsx

# 重启
pm2 restart ecosystem.config.js
```

**注意**：这只是临时方案，生产环境应该使用编译后的 JavaScript。

---

**完成！按照步骤执行即可！**




