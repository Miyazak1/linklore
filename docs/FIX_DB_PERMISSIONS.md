# 修复数据库权限问题

## 当前错误

```
Error: P1010: User 'linklore_user' was denied access on the database 'linklore.public'
```

**原因**：`linklore_user` 用户没有访问 `public` schema 的权限。

---

## 解决方案

### 授予 schema 权限

需要给 `linklore_user` 授予 `public` schema 的权限：

```bash
# 进入 PostgreSQL
sudo -u postgres psql

# 连接到 linklore 数据库
\c linklore

# 授予 schema 权限
GRANT ALL PRIVILEGES ON SCHEMA public TO linklore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO linklore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO linklore_user;

# 授予数据库权限（如果还没有）
GRANT ALL PRIVILEGES ON DATABASE linklore TO linklore_user;

# 退出
\q
```

---

## 完整操作步骤

### 第一步：授予权限

```bash
# 进入 PostgreSQL
sudo -u postgres psql

# 在 PostgreSQL 命令行中执行：
\c linklore
GRANT ALL PRIVILEGES ON SCHEMA public TO linklore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO linklore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO linklore_user;
GRANT ALL PRIVILEGES ON DATABASE linklore TO linklore_user;
\q
```

### 第二步：验证权限

```bash
# 测试连接
psql -h 127.0.0.1 -U linklore_user -d linklore
```

输入密码：`Nuan2230543`

如果连接成功，说明权限已正确配置。

### 第三步：重新运行迁移

```bash
cd /www/wwwroot/www.linkloredu.com
pnpm prisma:migrate
```

---

## 关于 pnpm 依赖安装

如果需要在 workspace root 添加依赖，使用 `-w` 标志：

```bash
# 在项目根目录
cd /www/wwwroot/www.linkloredu.com

# 添加依赖到 workspace root
pnpm add -D -w @types/sanitize-html @types/ali-oss
pnpm add -w bullmq ioredis

# 或者在 apps/web 目录添加
cd apps/web
pnpm add -D @types/sanitize-html @types/ali-oss
pnpm add bullmq ioredis
```

---

## 快速修复（一键执行）

```bash
# 1. 授予数据库权限
sudo -u postgres psql << 'EOF'
\c linklore
GRANT ALL PRIVILEGES ON SCHEMA public TO linklore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO linklore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO linklore_user;
GRANT ALL PRIVILEGES ON DATABASE linklore TO linklore_user;
\q
EOF

# 2. 验证权限
echo "测试数据库连接..."
psql -h 127.0.0.1 -U linklore_user -d linklore -c "SELECT 1;" <<< "Nuan2230543"

# 3. 重新运行迁移
cd /www/wwwroot/www.linkloredu.com
pnpm prisma:migrate
```

---

## 如果权限授予失败

### 检查用户是否存在

```bash
sudo -u postgres psql -c "\du linklore_user"
```

### 检查数据库是否存在

```bash
sudo -u postgres psql -c "\l linklore"
```

### 重新创建用户（如果需要）

```bash
sudo -u postgres psql << 'EOF'
DROP USER IF EXISTS linklore_user;
CREATE USER linklore_user WITH PASSWORD 'Nuan2230543';
GRANT ALL PRIVILEGES ON DATABASE linklore TO linklore_user;
\c linklore
GRANT ALL PRIVILEGES ON SCHEMA public TO linklore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO linklore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO linklore_user;
\q
EOF
```

---

## 重要提示

1. **Schema 权限很重要**：不仅要授予数据库权限，还要授予 schema 权限
2. **默认权限**：`ALTER DEFAULT PRIVILEGES` 确保未来创建的表也有权限
3. **测试连接**：授予权限后，测试连接确保配置正确

---

## 完成检查清单

- [ ] 数据库权限已授予（schema 和数据库）
- [ ] 数据库连接测试成功
- [ ] Prisma 迁移已成功运行
- [ ] 依赖已正确安装

---

## 下一步

1. 授予数据库权限
2. 测试数据库连接
3. 重新运行 Prisma 迁移
4. 继续构建和部署











