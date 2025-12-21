# 修复 Prisma Schema 路径问题

## 当前错误

```
Error: Could not load `--schema` from provided path `../../prisma/schema.prisma`: file or directory not found
```

**原因**：在项目根目录执行命令时，相对路径 `../../prisma/schema.prisma` 不正确。

---

## 解决方案

### 方案 1：使用正确的相对路径（从项目根目录）

```bash
# 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 使用正确的路径（从项目根目录）
npx prisma migrate reset --force --schema=./prisma/schema.prisma

# 或者直接使用 pnpm 命令（会自动找到正确的路径）
pnpm prisma:migrate
```

### 方案 2：从 apps/web 目录执行（推荐）

```bash
# 进入 apps/web 目录
cd /www/wwwroot/www.linkloredu.com/apps/web

# 从 apps/web 目录，../../prisma/schema.prisma 是正确的路径
npx prisma migrate reset --force --schema=../../prisma/schema.prisma

# 然后运行迁移
pnpm prisma:migrate
```

### 方案 3：使用绝对路径

```bash
# 使用绝对路径
npx prisma migrate reset --force --schema=/www/wwwroot/www.linkloredu.com/prisma/schema.prisma

# 然后运行迁移
cd /www/wwwroot/www.linkloredu.com
pnpm prisma:migrate
```

---

## 推荐操作（最简单）

直接使用 `pnpm prisma:migrate`，它会自动找到正确的路径：

```bash
cd /www/wwwroot/www.linkloredu.com

# 先重置数据库
cd apps/web
npx prisma migrate reset --force --schema=../../prisma/schema.prisma

# 回到根目录，运行迁移
cd ../..
pnpm prisma:migrate
```

---

## 一键修复

执行以下命令：

```bash
cd /www/wwwroot/www.linkloredu.com && \
echo "🔄 重置数据库..." && \
cd apps/web && \
npx prisma migrate reset --force --schema=../../prisma/schema.prisma && \
cd ../.. && \
echo "" && \
echo "✅ 重置完成，现在运行迁移..." && \
pnpm prisma:migrate && \
echo "" && \
echo "✅ 迁移完成！"
```

---

## 验证 Schema 文件位置

检查 schema 文件是否存在：

```bash
# 检查文件是否存在
ls -la /www/wwwroot/www.linkloredu.com/prisma/schema.prisma

# 或者从项目根目录
cd /www/wwwroot/www.linkloredu.com
ls -la prisma/schema.prisma
```

---

## 如果还是失败

### 检查项目结构

```bash
cd /www/wwwroot/www.linkloredu.com
ls -la prisma/
```

应该看到：
- `schema.prisma`
- `migrations/` 目录

### 使用绝对路径

```bash
# 使用绝对路径重置
npx prisma migrate reset --force --schema=/www/wwwroot/www.linkloredu.com/prisma/schema.prisma

# 然后运行迁移
pnpm prisma:migrate
```

---

## 重要提示

1. **路径问题**：从不同目录执行，相对路径不同
2. **推荐使用 pnpm**：`pnpm prisma:migrate` 会自动找到正确路径
3. **从 apps/web 执行**：如果手动执行，从 `apps/web` 目录执行，使用 `../../prisma/schema.prisma`

---

## 下一步

执行一键修复命令，重置数据库并重新运行迁移。











