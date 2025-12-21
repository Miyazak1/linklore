# 修复 bcryptjs 类型声明问题

## 问题
服务器构建失败：`Could not find a declaration file for module 'bcryptjs'`

## 解决方案
创建了 `apps/web/types/bcryptjs.d.ts` 类型声明文件，并更新了 `tsconfig.json` 包含该文件。

## 修复的文件
1. `apps/web/types/bcryptjs.d.ts` (新增) - bcryptjs 类型声明
2. `apps/web/tsconfig.json` (修改) - 添加 types 目录到 include

## 服务器操作步骤

### 方案 1：使用类型声明文件（推荐）
```bash
cd /www/wwwroot/linklore
git pull origin master
pnpm build
```

### 方案 2：如果方案 1 不行，重新安装依赖
```bash
cd /www/wwwroot/linklore
git pull origin master
pnpm install
pnpm build
```

