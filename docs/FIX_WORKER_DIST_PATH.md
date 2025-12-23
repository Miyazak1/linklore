# 修复 Worker dist 路径问题

## 问题分析

从检查结果看：
- `dist` 目录存在
- 里面有 `apps` 和 `worker` 子目录
- 但 `dist/index.js` 不存在

这说明编译输出可能在不同的位置。

## 检查文件实际位置

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 检查 dist 目录结构
echo "=== dist 目录结构 ==="
find dist -type f -name "*.js" | head -20

# 检查 worker 子目录
echo ""
echo "=== dist/worker 目录 ==="
ls -la dist/worker/ 2>/dev/null || echo "dist/worker 不存在"

# 检查 dist/worker/ai-queue
echo ""
echo "=== dist/worker/ai-queue 目录 ==="
ls -la dist/worker/ai-queue/ 2>/dev/null || echo "dist/worker/ai-queue 不存在"

# 查找所有 index.js
echo ""
echo "=== 查找所有 index.js ==="
find dist -name "index.js" 2>/dev/null
```

## 修复方案

### 方案 1：如果文件在 dist/worker/ai-queue/index.js

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 检查文件是否在这里
if [ -f "dist/worker/ai-queue/index.js" ]; then
    echo "✓ 文件在 dist/worker/ai-queue/index.js"
    
    # 复制到正确位置
    cp dist/worker/ai-queue/index.js dist/index.js
    
    # 或者创建符号链接
    # ln -sf worker/ai-queue/index.js dist/index.js
    
    echo "✓ 已复制到 dist/index.js"
    ls -lh dist/index.js
fi
```

### 方案 2：修改 tsconfig.json 配置

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 备份原配置
cp tsconfig.json tsconfig.json.bak

# 修改配置，确保输出到当前目录的 dist
cat > tsconfig.json << 'EOF'
{
	"compilerOptions": {
		"target": "ES2022",
		"lib": ["es2022"],
		"module": "esnext",
		"moduleResolution": "node",
		"outDir": "./dist",
		"rootDir": ".",
		"esModuleInterop": true,
		"strict": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"baseUrl": ".",
		"paths": {
			"@/*": ["../../apps/web/*"]
		}
	},
	"include": ["./**/*.ts", "../shim/**/*.ts", "./global.d.ts"],
	"exclude": ["node_modules", "dist"]
}
EOF

# 重新编译
rm -rf dist
pnpm exec tsc -p tsconfig.json

# 检查结果
ls -la dist/index.js
```

### 方案 3：使用相对路径编译

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 清理
rm -rf dist
mkdir -p dist

# 使用明确的输出目录
pnpm exec tsc --outDir ./dist --rootDir . index.ts db.ts db-client.ts path-resolver.ts

# 或者只编译 index.ts
pnpm exec tsc --outDir ./dist index.ts

# 检查结果
ls -la dist/index.js
```

### 方案 4：修改 ecosystem.config.js 使用实际路径

如果文件在 `dist/worker/ai-queue/index.js`，可以修改 PM2 配置：

```bash
cd /www/wwwroot/linklore

# 检查文件实际位置
find worker/ai-queue/dist -name "index.js" 2>/dev/null

# 如果找到，修改 ecosystem.config.js
nano ecosystem.config.js
```

找到 `linklore-worker` 配置，修改 `args` 为实际路径：

```javascript
{
    name: 'linklore-worker',
    script: 'node',
    args: './worker/ai-queue/dist/worker/ai-queue/index.js',  // 使用实际路径
    // ...
}
```

## 一键修复脚本

```bash
cd /www/wwwroot/linklore/worker/ai-queue

cat > fix-dist-path.sh << 'EOF'
#!/bin/bash
set -e

echo "=========================================="
echo "修复 Worker dist 路径"
echo "=========================================="

# 1. 查找 index.js 的实际位置
echo ""
echo "[1/4] 查找 index.js..."
INDEX_JS=$(find dist -name "index.js" 2>/dev/null | head -1)

if [ -z "$INDEX_JS" ]; then
    echo "✗ 找不到 index.js，尝试重新编译..."
    
    # 清理并重新编译
    rm -rf dist
    mkdir -p dist
    
    # 修改 tsconfig.json
    cat > tsconfig.json << 'TSEOF'
{
	"compilerOptions": {
		"target": "ES2022",
		"lib": ["es2022"],
		"module": "esnext",
		"moduleResolution": "node",
		"outDir": "./dist",
		"rootDir": ".",
		"esModuleInterop": true,
		"strict": false,
		"noImplicitAny": false,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"baseUrl": ".",
		"paths": {
			"@/*": ["../../apps/web/*"]
		}
	},
	"include": ["./**/*.ts", "../shim/**/*.ts", "./global.d.ts"],
	"exclude": ["node_modules", "dist"]
}
TSEOF
    
    echo "重新编译..."
    pnpm exec tsc -p tsconfig.json
    
    INDEX_JS=$(find dist -name "index.js" 2>/dev/null | head -1)
fi

if [ -z "$INDEX_JS" ]; then
    echo "✗ 编译失败，index.js 仍未生成"
    exit 1
fi

echo "✓ 找到文件：$INDEX_JS"

# 2. 如果不在 dist/index.js，复制或移动
echo ""
echo "[2/4] 检查文件位置..."
if [ "$INDEX_JS" != "dist/index.js" ]; then
    echo "文件在：$INDEX_JS"
    echo "复制到 dist/index.js..."
    cp "$INDEX_JS" dist/index.js
    echo "✓ 已复制"
else
    echo "✓ 文件已在正确位置"
fi

# 3. 验证
echo ""
echo "[3/4] 验证文件..."
if [ -f "dist/index.js" ]; then
    echo "✓ dist/index.js 存在"
    ls -lh dist/index.js
    echo ""
    echo "文件前 5 行："
    head -5 dist/index.js
else
    echo "✗ dist/index.js 不存在"
    exit 1
fi

# 4. 返回根目录并更新 PM2 配置
echo ""
echo "[4/4] 更新 PM2 配置..."
cd /www/wwwroot/linklore

# 检查 ecosystem.config.js 中的路径
if grep -q "worker/ai-queue/dist/index.js" ecosystem.config.js; then
    echo "✓ PM2 配置路径正确"
else
    echo "需要更新 PM2 配置..."
    # 这里可以自动更新，但为了安全，建议手动检查
    echo "请检查 ecosystem.config.js 中的路径是否为：./worker/ai-queue/dist/index.js"
fi

echo ""
echo "=========================================="
echo "完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 重启 worker: pm2 restart linklore-worker"
echo "2. 查看状态: pm2 status"
EOF

chmod +x fix-dist-path.sh
./fix-dist-path.sh
```

---

**请先执行查找文件的命令，确认 index.js 的实际位置！**




