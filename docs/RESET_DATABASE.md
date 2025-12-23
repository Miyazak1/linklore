# 清空数据库并重新构建

**目标**：清空数据库并重新运行所有迁移，确保数据库架构与代码完全一致  
**数据库信息**：
- 数据库名：`linklore`
- 用户名：`linklore_user`
- 密码：`a8rEczHFnMGm`

---

## ⚠️ 重要警告

**此操作会删除所有数据！** 包括：
- 所有用户数据
- 所有话题和文档
- 所有聊天记录
- 所有书籍数据
- 所有游戏记录

**请确保：**
1. 这是开发/测试环境，或者
2. 你已经备份了重要数据

---

## 一、目标（一句话）

清空 `linklore` 数据库的所有表和数据，然后重新运行 Prisma 迁移，构建完整的数据库架构。

---

## 二、变更清单

### 服务器端操作

**需要执行的操作**：
1. 停止 PM2 服务（避免数据库连接冲突）
2. 清空数据库（删除所有表）
3. 重新运行 Prisma 迁移
4. 重新生成 Prisma Client
5. 重新构建项目
6. 重启服务

---

## 三、实现方案（面向非程序员）

### 为什么需要清空重建？

1. **解决架构不匹配**：确保数据库架构与代码完全一致
2. **清理混乱状态**：删除可能存在的错误数据或表结构
3. **从零开始**：按照正确的迁移顺序重新构建

### 重建流程

1. **停止服务**：避免数据库连接冲突
2. **清空数据库**：删除所有表和数据
3. **运行迁移**：按照迁移文件顺序重新创建表结构
4. **生成客户端**：重新生成 Prisma Client
5. **重新构建**：编译项目代码
6. **重启服务**：启动应用

### 风险说明

- **数据丢失**：所有数据将被永久删除，无法恢复
- **服务中断**：重建期间网站无法访问（约 5-10 分钟）
- **配置保留**：环境变量和配置文件会保留

---

## 四、重建步骤（详细操作）

### 步骤 1：停止 PM2 服务

在宝塔面板 **终端** 中执行：

```bash
cd /www/wwwroot/linklore

# 停止所有 PM2 进程
pm2 stop all

# 查看状态确认已停止
pm2 status
```

**预期结果**：所有进程状态显示为 `stopped`

---

### 步骤 2：清空数据库

#### 方式1：使用 Prisma（推荐）

```bash
cd /www/wwwroot/linklore

# 重置数据库（删除所有表和数据，然后运行迁移）
pnpm prisma migrate reset --force
```

**注意**：`--force` 参数会跳过确认提示，直接执行。

#### 方式2：手动清空（如果方式1失败）

在宝塔面板中：

1. 进入 **数据库** 菜单
2. 找到 `linklore` 数据库
3. 点击 **管理** 或 **phpPgAdmin**
4. 执行以下 SQL：

```sql
-- 删除所有表（CASCADE 会删除依赖关系）
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

或者使用命令行：

```bash
# 连接数据库并清空
psql -U linklore_user -d linklore -h localhost -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"
```

**需要输入密码**：`a8rEczHFnMGm`

---

### 步骤 3：运行数据库迁移

```bash
cd /www/wwwroot/linklore

# 运行所有迁移
pnpm prisma migrate deploy

# 或者使用开发模式（会创建新的迁移）
# pnpm prisma migrate dev
```

**预期结果**：看到所有迁移成功执行的信息

---

### 步骤 4：执行手动 SQL 文件

```bash
cd /www/wwwroot/linklore

# 执行手动 SQL 文件（添加书籍分类等字段）
pnpm prisma db execute --file prisma/migrations/manual_add_book_categories.sql --schema prisma/schema.prisma

# 执行其他手动 SQL（如果有）
pnpm prisma db execute --file prisma/migrations/manual_add_baike_game_models.sql --schema prisma/schema.prisma
pnpm prisma db execute --file prisma/migrations/manual_add_chat_models.sql --schema prisma/schema.prisma
```

**预期结果**：SQL 执行成功，无错误

---

### 步骤 5：重新生成 Prisma Client

```bash
cd /www/wwwroot/linklore

# 生成 Prisma Client
pnpm prisma:generate
```

**预期结果**：看到 "Generated Prisma Client" 信息

---

### 步骤 6：重新构建项目

```bash
cd /www/wwwroot/linklore

# 构建项目
pnpm build
```

**预期结果**：构建成功，无错误

---

### 步骤 7：重启服务

```bash
cd /www/wwwroot/linklore

# 重启 PM2 服务
pm2 restart ecosystem.config.js

# 或者如果进程已删除，重新启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs --lines 20
```

**预期结果**：
- `pm2 status` 显示所有进程为 `online`
- 日志中无错误信息

---

## 五、一键执行脚本

创建一个脚本文件 `reset-db.sh`：

```bash
#!/bin/bash
set -euo pipefail

echo "=========================================="
echo "清空数据库并重新构建"
echo "=========================================="

cd /www/wwwroot/linklore

# 1. 停止服务
echo "[1/7] 停止 PM2 服务..."
pm2 stop all || true
sleep 2

# 2. 清空数据库
echo "[2/7] 清空数据库..."
pnpm prisma migrate reset --force

# 3. 运行迁移
echo "[3/7] 运行数据库迁移..."
pnpm prisma migrate deploy

# 4. 执行手动 SQL
echo "[4/7] 执行手动 SQL 文件..."
pnpm prisma db execute --file prisma/migrations/manual_add_book_categories.sql --schema prisma/schema.prisma || true
pnpm prisma db execute --file prisma/migrations/manual_add_baike_game_models.sql --schema prisma/schema.prisma || true
pnpm prisma db execute --file prisma/migrations/manual_add_chat_models.sql --schema prisma/schema.prisma || true

# 5. 生成 Prisma Client
echo "[5/7] 生成 Prisma Client..."
pnpm prisma:generate

# 6. 构建项目
echo "[6/7] 构建项目..."
pnpm build

# 7. 重启服务
echo "[7/7] 重启服务..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

echo ""
echo "=========================================="
echo "完成！"
echo "=========================================="
echo ""
echo "查看状态：pm2 status"
echo "查看日志：pm2 logs"
```

**使用方法**：

```bash
cd /www/wwwroot/linklore

# 创建脚本文件（复制上面的内容）
nano reset-db.sh

# 添加执行权限
chmod +x reset-db.sh

# 运行脚本
./reset-db.sh
```

---

## 六、验证重建

### 测试用例 TC-2025-RESET-001：数据库架构检查

- **前置条件**：重建完成
- **操作步骤**：
  1. 在终端执行：`pnpm prisma studio`（如果可用）
  2. 或使用数据库管理工具查看表结构
  3. 检查 `Book` 表是否有 `category` 字段
- **预期结果**：
  - 所有表都存在
  - `Book` 表有 `category`、`tags`、`language` 等字段
  - 索引已创建
- **实际结果**：（由你填写）

---

### 测试用例 TC-2025-RESET-002：服务状态检查

- **前置条件**：服务已重启
- **操作步骤**：
  1. 执行：`pm2 status`
  2. 执行：`pm2 logs --lines 20`
  3. 访问网站首页
- **预期结果**：
  - 所有进程状态为 `online`
  - 日志中无错误
  - 网站正常访问
- **实际结果**：（由你填写）

---

### 测试用例 TC-2025-RESET-003：功能测试

- **前置条件**：网站已正常访问
- **操作步骤**：
  1. 测试注册功能
  2. 测试登录功能
  3. 测试图书馆页面（之前报错的页面）
  4. 测试聊天功能
- **预期结果**：
  - 所有功能正常工作
  - 图书馆页面不再报错
  - 无数据库错误
- **实际结果**：（由你填写）

---

## 七、常见问题

### 问题1：prisma migrate reset 失败

**错误信息**：
```
Error: P3005
Database error: schema "public" does not exist
```

**解决方法**：
```bash
# 手动创建 schema
psql -U linklore_user -d linklore -h localhost -c "CREATE SCHEMA IF NOT EXISTS public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"
```

---

### 问题2：手动 SQL 执行失败

**错误信息**：
```
Error: relation "Book" does not exist
```

**解决方法**：
- 先运行 `pnpm prisma migrate deploy` 创建表
- 再执行手动 SQL 文件

---

### 问题3：构建仍然失败

**错误信息**：
```
The column `Book.category` does not exist
```

**解决方法**：
1. 检查数据库表结构：
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'Book';
   ```

2. 如果字段不存在，手动添加：
   ```sql
   ALTER TABLE "Book" ADD COLUMN "category" TEXT;
   ```

3. 重新生成 Prisma Client：
   ```bash
   pnpm prisma:generate
   ```

---

## 八、回退与已知问题

### 回退方式

如果重建后出现问题，可以：

1. **从备份恢复**（如果有备份）
2. **重新执行重建流程**
3. **检查环境变量**：确保 `DATABASE_URL` 正确

### 已知问题/限制

- 重建会删除所有数据，无法恢复
- 需要重新注册用户和创建数据
- 重建期间服务会中断

---

## 九、版本信息

- **文档版本**：v1.0.0
- **创建时间**：2025-01-27
- **适用环境**：宝塔面板 + PostgreSQL

---

## 十、后续建议

1. **定期备份**：重建后设置数据库自动备份
2. **测试功能**：重建后测试所有主要功能
3. **监控日志**：关注 PM2 日志，确保无错误
4. **数据迁移**：如果有旧数据，考虑数据迁移方案

---

**完成！数据库已清空并重新构建！**




