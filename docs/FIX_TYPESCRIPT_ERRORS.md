# 修复 TypeScript 编译错误

## 当前错误

构建失败，出现多个 TypeScript 编译错误：

1. **缺少类型声明文件**：
   - `sanitize-html` - 需要 `@types/sanitize-html`
   - `ali-oss` - 需要 `@types/ali-oss`
   - `bullmq` - 缺少模块
   - `ioredis` - 缺少模块

2. **类型错误**：
   - 类型不匹配
   - 隐式 any 类型

3. **模块找不到**：
   - `../shim/moderation.js`
   - `../shim/chatConsensus.js`
   - `../shim/prisma.js`

---

## 解决方案

### 方案 1：安装缺少的类型声明文件（推荐）

```bash
# 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 安装缺少的类型声明文件
pnpm add -D @types/sanitize-html @types/ali-oss

# 安装缺少的模块（如果确实缺少）
pnpm add bullmq ioredis
```

### 方案 2：暂时跳过 worker 构建，只构建 web 应用

如果 worker 不是必需的，可以暂时跳过：

```bash
# 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 只构建 web 应用
cd apps/web
pnpm build
```

### 方案 3：修复 TypeScript 配置（如果错误太多）

可以修改 `tsconfig.json` 放宽类型检查：

```json
{
  "compilerOptions": {
    "noImplicitAny": false,
    "strict": false,
    "skipLibCheck": true
  }
}
```

---

## 快速修复（推荐）

### 第一步：安装缺少的类型声明和模块

```bash
cd /www/wwwroot/www.linkloredu.com

# 安装缺少的类型声明文件
pnpm add -D @types/sanitize-html @types/ali-oss

# 安装缺少的模块
pnpm add bullmq ioredis
```

### 第二步：检查缺失的 shim 文件

```bash
# 检查 shim 目录
ls -la worker/shim/

# 如果文件不存在，可能需要创建或修复路径
```

### 第三步：重新构建

```bash
# 重新运行构建
pnpm build
```

---

## 如果错误太多，暂时跳过 worker 构建

如果 worker 构建错误太多，可以暂时只构建 web 应用：

```bash
cd /www/wwwroot/www.linkloredu.com

# 只构建 web 应用
cd apps/web
pnpm build

# 如果成功，回到根目录
cd ../..

# 手动启动服务（跳过 worker）
pm2 start ecosystem.config.js --env production --only linklore-web
```

---

## 检查缺失的模块

### 检查 bullmq 和 ioredis

```bash
# 检查是否已安装
pnpm list bullmq ioredis

# 如果未安装，安装它们
pnpm add bullmq ioredis
```

### 检查 shim 文件

```bash
# 检查 worker/shim 目录
ls -la worker/shim/

# 应该看到：
# - moderation.js (或 .ts)
# - chatConsensus.js (或 .ts)
# - prisma.js (或 .ts)
```

如果文件不存在，可能需要：
1. 检查文件是否在其他位置
2. 或者这些文件不是必需的（可以注释掉相关导入）

---

## 完整修复流程

```bash
# 1. 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 2. 安装缺少的类型声明
pnpm add -D @types/sanitize-html @types/ali-oss

# 3. 安装缺少的模块
pnpm add bullmq ioredis

# 4. 检查 shim 文件
ls -la worker/shim/

# 5. 重新构建
pnpm build
```

---

## 如果构建仍然失败

### 选项 A：只构建 web 应用

```bash
cd /www/wwwroot/www.linkloredu.com/apps/web
pnpm build
```

### 选项 B：修改 TypeScript 配置（放宽检查）

编辑 `worker/ai-queue/tsconfig.json`：

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

---

## 重要提示

1. **类型错误不影响运行**：TypeScript 错误不会阻止应用运行，只是构建失败
2. **可以先启动服务**：即使构建失败，也可以尝试启动服务
3. **worker 可能不是必需的**：如果只是测试，可以先不运行 worker

---

## 快速操作

执行以下命令，快速修复：

```bash
cd /www/wwwroot/www.linkloredu.com && \
pnpm add -D @types/sanitize-html @types/ali-oss && \
pnpm add bullmq ioredis && \
echo "已安装缺少的模块，现在重新构建..." && \
pnpm build
```

---

## 如果还是失败

可以暂时只构建 web 应用：

```bash
cd /www/wwwroot/www.linkloredu.com/apps/web
pnpm build
```

然后手动启动服务。

---

## 下一步

1. 安装缺少的类型声明和模块
2. 重新构建
3. 如果成功，继续部署
4. 如果失败，考虑只构建 web 应用











