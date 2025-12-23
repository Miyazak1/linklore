# 删除或清空数据库指南

**目标**：删除或清空 `linklore` 数据库，然后重新构建  
**数据库信息**：
- 数据库名：`linklore`
- 用户名：`linklore_user`
- 密码：`a8rEczHFnMGm`

---

## 方式1：在宝塔面板中删除数据库（推荐）

### 步骤

1. **登录宝塔面板**
2. **进入数据库菜单**
   - 点击左侧菜单 **数据库**
   - 选择 **PgSQL** 标签
3. **删除数据库**
   - 找到 `linklore` 数据库
   - 点击右侧的 **删除** 按钮
   - 确认删除
4. **重新创建数据库**
   - 点击 **添加数据库** 按钮
   - 数据库名：`linklore`
   - 用户名：`linklore_user`
   - 密码：`a8rEczHFnMGm`（或设置新密码）
   - 点击 **提交**

---

## 方式2：使用 SQL 命令清空数据库（保留数据库结构）

### 在宝塔面板终端执行

```bash
cd /www/wwwroot/linklore

# 连接数据库并清空所有表
psql -U linklore_user -d linklore -h localhost <<EOF
-- 删除所有表（CASCADE 会删除依赖关系）
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
EOF
```

**需要输入密码**：`a8rEczHFnMGm`

### 或者使用环境变量（避免输入密码）

```bash
cd /www/wwwroot/linklore

# 使用环境变量中的 DATABASE_URL
export PGPASSWORD='a8rEczHFnMGm'
psql -U linklore_user -d linklore -h localhost -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"
```

---

## 方式3：使用 Prisma 重置（最简单）

```bash
cd /www/wwwroot/linklore

# 停止服务
pm2 stop all

# 重置数据库（会删除所有表和数据，然后运行迁移）
pnpm prisma migrate reset --force

# 如果 reset 失败，先手动清空（见方式2），然后：
pnpm prisma migrate deploy
```

---

## 方式4：完全删除并重建（最彻底）

### 步骤 1：在宝塔面板中删除数据库

1. 进入 **数据库** → **PgSQL**
2. 找到 `linklore` 数据库
3. 点击 **删除** 按钮
4. 确认删除

### 步骤 2：重新创建数据库

1. 点击 **添加数据库**
2. 填写信息：
   - 数据库名：`linklore`
   - 用户名：`linklore_user`
   - 密码：`a8rEczHFnMGm`（或新密码）
3. 点击 **提交**

### 步骤 3：重新运行迁移

```bash
cd /www/wwwroot/linklore

# 1. 停止服务
pm2 stop all

# 2. 删除迁移记录（如果存在）
psql -U linklore_user -d linklore -h localhost -c "DROP TABLE IF EXISTS \"_prisma_migrations\";" <<EOF
a8rEczHFnMGm
EOF

# 3. 运行所有迁移
pnpm prisma migrate deploy

# 4. 执行手动 SQL 文件
pnpm prisma db execute --file prisma/migrations/manual_add_book_categories.sql --schema prisma/schema.prisma
pnpm prisma db execute --file prisma/migrations/manual_add_baike_game_models.sql --schema prisma/schema.prisma
pnpm prisma db execute --file prisma/migrations/manual_add_chat_models.sql --schema prisma/schema.prisma

# 5. 生成 Prisma Client
pnpm prisma:generate

# 6. 构建项目
pnpm build

# 7. 重启服务
pm2 restart ecosystem.config.js
```

---

## 一键清空脚本

创建脚本 `clear-db.sh`：

```bash
#!/bin/bash
set -euo pipefail

echo "=========================================="
echo "清空数据库"
echo "=========================================="

cd /www/wwwroot/linklore

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 确认操作
echo -e "${RED}警告：此操作会删除所有数据！${NC}"
read -p "确定要清空数据库吗？(yes/no) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}操作已取消${NC}"
    exit 0
fi

# 停止服务
echo -e "\n[1/4] 停止 PM2 服务..."
pm2 stop all || true
sleep 2

# 清空数据库
echo -e "\n[2/4] 清空数据库..."
export PGPASSWORD='a8rEczHFnMGm'
psql -U linklore_user -d linklore -h localhost -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

# 删除迁移记录
echo -e "\n[3/4] 删除迁移记录..."
psql -U linklore_user -d linklore -h localhost -c "DROP TABLE IF EXISTS \"_prisma_migrations\";" || true

# 运行迁移
echo -e "\n[4/4] 运行数据库迁移..."
pnpm prisma migrate deploy

echo -e "\n${GREEN}数据库已清空并重新构建！${NC}"
echo ""
echo "下一步："
echo "1. 执行手动 SQL: pnpm prisma db execute --file prisma/migrations/manual_add_*.sql --schema prisma/schema.prisma"
echo "2. 生成 Prisma Client: pnpm prisma:generate"
echo "3. 构建项目: pnpm build"
echo "4. 重启服务: pm2 restart ecosystem.config.js"
```

**使用方法**：

```bash
cd /www/wwwroot/linklore

# 创建脚本
nano clear-db.sh
# 复制上面的内容

# 添加执行权限
chmod +x clear-db.sh

# 运行脚本
./clear-db.sh
```

---

## 推荐流程（最简单）

### 在宝塔面板中操作

1. **删除数据库**
   - 数据库 → PgSQL → 找到 `linklore` → 点击 **删除**

2. **重新创建数据库**
   - 点击 **添加数据库**
   - 数据库名：`linklore`
   - 用户名：`linklore_user`
   - 密码：`a8rEczHFnMGm`
   - 提交

### 在终端中操作

```bash
cd /www/wwwroot/linklore

# 1. 停止服务
pm2 stop all

# 2. 删除迁移记录表（如果存在）
export PGPASSWORD='a8rEczHFnMGm'
psql -U linklore_user -d linklore -h localhost -c "DROP TABLE IF EXISTS \"_prisma_migrations\";" || true

# 3. 运行所有迁移
pnpm prisma migrate deploy

# 4. 执行手动 SQL
pnpm prisma db execute --file prisma/migrations/manual_add_book_categories.sql --schema prisma/schema.prisma
pnpm prisma db execute --file prisma/migrations/manual_add_baike_game_models.sql --schema prisma/schema.prisma
pnpm prisma db execute --file prisma/migrations/manual_add_chat_models.sql --schema prisma/schema.prisma

# 5. 生成 Prisma Client
pnpm prisma:generate

# 6. 构建项目
pnpm build

# 7. 重启服务
pm2 restart ecosystem.config.js

# 8. 查看状态
pm2 status
```

---

## 注意事项

1. **备份数据**：删除前如果有重要数据，先备份
2. **停止服务**：删除/清空前先停止 PM2 服务
3. **环境变量**：确保 `.env.production` 中的 `DATABASE_URL` 正确
4. **密码**：如果修改了数据库密码，记得更新环境变量

---

## 验证

清空后验证：

```bash
# 检查表是否存在
psql -U linklore_user -d linklore -h localhost -c "\dt"

# 应该显示空的表列表或只有系统表
```

---

**完成！数据库已清空，可以重新构建了！**




