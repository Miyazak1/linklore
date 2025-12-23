# 调试 Worker 构建错误

## 当前问题

构建失败，需要查看具体错误信息。

## 查看错误信息

### 步骤 1：查看 TypeScript 编译错误

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 查看详细编译错误
pnpm exec tsc -p tsconfig.json 2>&1 | head -100

# 或者只查看错误（不生成文件）
pnpm exec tsc -p tsconfig.json --noEmit 2>&1 | head -100
```

### 步骤 2：检查 TypeScript 配置

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 查看 tsconfig.json
cat tsconfig.json

# 检查文件是否存在
ls -la tsconfig.json
```

### 步骤 3：检查源文件

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 检查主要文件是否存在
ls -la index.ts
ls -la db.ts
ls -la db-client.ts
ls -la path-resolver.ts
```

### 步骤 4：检查依赖

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 检查 node_modules
ls -la node_modules | head -20

# 检查 package.json
cat package.json
```

## 常见错误和解决方案

### 错误 1：找不到模块

如果错误是 `Cannot find module 'xxx'`：

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 安装缺少的依赖
pnpm install

# 或者在项目根目录安装
cd /www/wwwroot/linklore
pnpm install
```

### 错误 2：类型错误

如果错误是类型相关的：

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 修改 tsconfig.json，放宽类型检查
nano tsconfig.json
```

添加或修改：
```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,
    "skipLibCheck": true
  }
}
```

### 错误 3：路径解析错误

如果错误是路径相关的：

```bash
cd /www/wwwroot/linklore/worker/ai-queue

# 检查 tsconfig.json 中的 paths 配置
cat tsconfig.json | grep -A 5 paths
```

## 快速调试命令

执行以下命令查看所有信息：

```bash
cd /www/wwwroot/linklore/worker/ai-queue

echo "=== 1. 检查文件 ==="
ls -la *.ts

echo ""
echo "=== 2. 检查配置 ==="
cat tsconfig.json

echo ""
echo "=== 3. 检查依赖 ==="
cat package.json

echo ""
echo "=== 4. 尝试编译并查看错误 ==="
pnpm exec tsc -p tsconfig.json 2>&1 | head -50
```

---

**请执行上面的命令，把错误信息发给我，我会帮你修复！**




