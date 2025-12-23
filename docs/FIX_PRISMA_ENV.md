# 修复 Prisma 环境变量问题

## 当前错误

```
Error: P1010: User `postgres` was denied access on the database `linklore.public`
```

**原因**：Prisma 正在使用 `postgres` 用户连接数据库，但应该使用 `linklore_user`。

从错误信息可以看到：
```
Environment variables loaded from ../../prisma/.env
```

说明 Prisma 正在从 `prisma/.env` 文件读取环境变量，而不是从 `apps/web/.env.production`。

---

## 解决方案

### 方法 1：更新 prisma/.env 文件（推荐）

Prisma 会优先读取 `prisma/.env` 文件，需要在这个文件中配置数据库连接。

```bash
# 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 检查 prisma/.env 文件是否存在
ls -la prisma/.env

# 如果文件存在，编辑它
nano prisma/.env
# 或者使用宝塔面板文件管理器编辑
```

添加或修改 `DATABASE_URL`：

```bash
DATABASE_URL="postgresql://linklore_user:Nuan2230543@127.0.0.1:5432/linklore"
```

### 方法 2：创建 prisma/.env 文件（如果不存在）

```bash
# 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 创建 prisma/.env 文件
echo 'DATABASE_URL="postgresql://linklore_user:Nuan2230543@127.0.0.1:5432/linklore"' > prisma/.env

# 验证
cat prisma/.env
```

---

## 完整操作步骤

### 第一步：更新 prisma/.env 文件

```bash
cd /www/wwwroot/www.linkloredu.com

# 创建或更新 prisma/.env 文件
echo 'DATABASE_URL="postgresql://linklore_user:Nuan2230543@127.0.0.1:5432/linklore"' > prisma/.env

# 验证
cat prisma/.env
```

### 第二步：重新运行部署脚本

```bash
./infrastructure/scripts/deploy.sh
```

或者只运行数据库迁移：

```bash
pnpm prisma:migrate
```

---

## 使用宝塔面板文件管理器

1. 进入 **文件** 菜单
2. 导航到：`/www/wwwroot/www.linkloredu.com/prisma/`
3. 找到或创建 `.env` 文件
4. 点击文件名进行编辑
5. 添加：

```bash
DATABASE_URL="postgresql://linklore_user:Nuan2230543@127.0.0.1:5432/linklore"
```

6. 点击 **保存**

---

## 验证配置

确保两个环境变量文件都配置正确：

```bash
# 检查 apps/web/.env.production
cat apps/web/.env.production

# 检查 prisma/.env
cat prisma/.env
```

两个文件都应该包含 `DATABASE_URL`，且使用 `linklore_user` 用户。

---

## 重新运行迁移

配置好 `prisma/.env` 后，重新运行迁移：

```bash
cd /www/wwwroot/www.linkloredu.com

# 方法 1：运行完整的部署脚本
./infrastructure/scripts/deploy.sh

# 方法 2：只运行数据库迁移
pnpm prisma:migrate
```

---

## 如果还有权限问题

### 检查数据库用户权限

```bash
# 进入 PostgreSQL
sudo -u postgres psql

# 检查用户权限
\du linklore_user

# 检查数据库权限
\l linklore

# 如果需要，重新授予权限
GRANT ALL PRIVILEGES ON DATABASE linklore TO linklore_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO linklore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO linklore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO linklore_user;

# 退出
\q
```

---

## 快速修复

执行以下命令，快速修复：

```bash
cd /www/wwwroot/www.linkloredu.com && \
echo 'DATABASE_URL="postgresql://linklore_user:Nuan2230543@127.0.0.1:5432/linklore"' > prisma/.env && \
cat prisma/.env && \
echo "" && \
echo "prisma/.env 已更新，现在重新运行迁移：" && \
pnpm prisma:migrate
```

---

## 重要提示

1. **Prisma 使用 prisma/.env**：Prisma 会优先读取 `prisma/.env` 文件
2. **两个文件都需要配置**：
   - `apps/web/.env.production` - 用于 Next.js 应用
   - `prisma/.env` - 用于 Prisma 迁移
3. **使用正确的用户**：确保使用 `linklore_user` 而不是 `postgres`

---

## 完成检查清单

- [x] 数据库用户已创建（`linklore_user`）
- [x] `apps/web/.env.production` 已配置
- [ ] `prisma/.env` 已配置（这是当前问题）
- [ ] 数据库迁移已成功运行
- [ ] PM2 服务已启动

---

## 下一步

1. 更新 `prisma/.env` 文件
2. 重新运行数据库迁移
3. 继续部署流程















