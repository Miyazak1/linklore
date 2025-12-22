# 检查 Worker 构建状态

## 当前情况

TypeScript 编译没有显示错误，但文件可能没有生成。需要检查：

## 检查步骤

### 步骤 1：检查 dist 目录

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 检查 dist 目录是否存在
ls -la dist/

# 检查是否有 index.js
ls -la dist/index.js

# 如果存在，查看文件大小和内容
if [ -f "dist/index.js" ]; then
    echo "✓ 文件存在"
    ls -lh dist/index.js
    echo ""
    echo "文件前几行："
    head -20 dist/index.js
else
    echo "✗ 文件不存在"
fi
```

### 步骤 2：检查 TypeScript 配置

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 查看 tsconfig.json
cat tsconfig.json

# 检查 outDir 配置
grep -A 2 "outDir" tsconfig.json
```

### 步骤 3：手动编译并查看详细输出

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 清理旧的 dist 目录
rm -rf dist

# 重新编译，显示所有信息
pnpm exec tsc -p tsconfig.json --verbose 2>&1

# 或者使用 pnpm build
pnpm build 2>&1
```

### 步骤 4：检查源文件

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 检查主要源文件
echo "=== 源文件列表 ==="
ls -la *.ts

# 检查 index.ts 是否存在
if [ -f "index.ts" ]; then
    echo "✓ index.ts 存在"
    echo "文件大小："
    ls -lh index.ts
else
    echo "✗ index.ts 不存在"
fi
```

### 步骤 5：检查 package.json 中的 build 脚本

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 查看 build 脚本
cat package.json | grep -A 5 "scripts"
```

## 如果文件确实没有生成

### 方案 1：强制重新编译

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 删除 dist 目录
rm -rf dist

# 创建 dist 目录
mkdir -p dist

# 手动编译
pnpm exec tsc -p tsconfig.json

# 检查结果
ls -la dist/
```

### 方案 2：检查权限

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 检查当前用户权限
whoami

# 检查目录权限
ls -la .

# 如果需要，修改权限
chmod -R 755 .
```

### 方案 3：使用绝对路径编译

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 使用绝对路径
pnpm exec tsc -p /www/wwwroot/linklore/worker/ai-queue/tsconfig.json --outDir /www/wwwroot/linklore/worker/ai-queue/dist
```

## 一键检查脚本

```bash
cd /www/wwwroot/linklore/worker/ai-queue

cat > check-build.sh << 'EOF'
#!/bin/bash
echo "=========================================="
echo "检查 Worker 构建状态"
echo "=========================================="

echo ""
echo "1. 检查源文件..."
ls -la *.ts 2>/dev/null || echo "没有找到 .ts 文件"

echo ""
echo "2. 检查 dist 目录..."
if [ -d "dist" ]; then
    echo "✓ dist 目录存在"
    ls -la dist/ | head -10
else
    echo "✗ dist 目录不存在"
fi

echo ""
echo "3. 检查 index.js..."
if [ -f "dist/index.js" ]; then
    echo "✓ dist/index.js 存在"
    ls -lh dist/index.js
    echo ""
    echo "文件前 5 行："
    head -5 dist/index.js
else
    echo "✗ dist/index.js 不存在"
fi

echo ""
echo "4. 检查 tsconfig.json..."
if [ -f "tsconfig.json" ]; then
    echo "✓ tsconfig.json 存在"
    echo "outDir 配置："
    grep "outDir" tsconfig.json
else
    echo "✗ tsconfig.json 不存在"
fi

echo ""
echo "5. 尝试编译..."
pnpm exec tsc -p tsconfig.json 2>&1 | tail -20

echo ""
echo "6. 再次检查 dist/index.js..."
if [ -f "dist/index.js" ]; then
    echo "✓ 编译成功！"
    ls -lh dist/index.js
else
    echo "✗ 编译失败，文件仍未生成"
fi
EOF

chmod +x check-build.sh
./check-build.sh
```

---

**请执行上面的检查步骤，把结果发给我！**

