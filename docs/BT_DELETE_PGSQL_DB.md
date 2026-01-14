# 宝塔面板删除 PostgreSQL 数据库失败解决方案

## 问题原因

删除 PostgreSQL 数据库失败通常是因为：
1. 数据库正在被使用（有活跃连接）
2. 有其他进程占用数据库
3. 数据库有依赖关系（如外键约束）

## 解决方法

### 方法1：通过宝塔面板强制删除（推荐）

1. **停止可能使用数据库的服务**
   - 如果有 Docker 容器在使用，先停止：
     ```bash
     cd /www/wwwroot/linklore
     docker-compose stop web
     ```

2. **在宝塔面板中删除**
   - 进入 **数据库** → **PgSQL**
   - 找到要删除的数据库（用户名：`linklore`）
   - 点击 **删除**

### 方法2：通过命令行删除（最可靠）

**在宝塔面板终端执行**：

```bash
# 1. 连接到 PostgreSQL（使用 postgres 超级用户）
sudo -u postgres psql

# 或者如果宝塔面板有特定的 PostgreSQL 用户
psql -U postgres -h localhost
```

**在 PostgreSQL 命令行中执行**：

```sql
-- 1. 查看所有数据库
\l

-- 2. 终止所有连接到该数据库的会话
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'linklore'
  AND pid <> pg_backend_pid();

-- 3. 删除数据库
DROP DATABASE IF EXISTS linklore;

-- 4. 删除用户（如果需要）
DROP USER IF EXISTS linklore;

-- 5. 退出
\q
```

### 方法3：使用宝塔面板的命令行工具

**在宝塔面板终端执行**：

```bash
# 1. 查找 PostgreSQL 数据目录
# 通常在 /www/server/pgsql/data 或 /www/server/postgresql/data

# 2. 停止 PostgreSQL 服务
systemctl stop postgresql
# 或者
/etc/init.d/postgresql stop

# 3. 连接到 PostgreSQL（使用 postgres 用户）
sudo -u postgres psql << EOF
-- 终止所有连接
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'linklore'
  AND pid <> pg_backend_pid();

-- 删除数据库
DROP DATABASE IF EXISTS linklore;

-- 删除用户
DROP USER IF EXISTS linklore;
EOF

# 4. 重启 PostgreSQL 服务
systemctl start postgresql
# 或者
/etc/init.d/postgresql start
```

### 方法4：使用宝塔面板的数据库管理功能

1. **在宝塔面板中**：
   - 进入 **数据库** → **PgSQL**
   - 找到要删除的数据库
   - 点击 **权限** → 查看是否有其他用户在使用
   - 点击 **改密** → 先修改密码（这样可以断开现有连接）
   - 然后点击 **删除**

2. **如果还是失败，使用命令行**（见方法2）

## 完整删除脚本

创建一个脚本文件来安全删除数据库：

```bash
#!/bin/bash
# 删除 PostgreSQL 数据库脚本

DB_NAME="linklore"
DB_USER="linklore"

echo "正在删除数据库: $DB_NAME 和用户: $DB_USER"

# 使用 postgres 用户执行
sudo -u postgres psql << EOF
-- 终止所有连接到该数据库的会话
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();

-- 删除数据库
DROP DATABASE IF EXISTS $DB_NAME;

-- 删除用户
DROP USER IF EXISTS $DB_USER;

-- 确认删除
\l
\du
EOF

echo "删除完成！"
```

**使用方法**：

```bash
# 保存为脚本
nano /tmp/delete_db.sh
# 粘贴上面的内容，修改 DB_NAME 和 DB_USER

# 添加执行权限
chmod +x /tmp/delete_db.sh

# 执行脚本
/tmp/delete_db.sh
```

## 验证删除

删除后，验证是否成功：

```bash
# 查看所有数据库
sudo -u postgres psql -l

# 查看所有用户
sudo -u postgres psql -c "\du"
```

## 注意事项

1. **删除前备份**（如果需要保留数据）：
   ```bash
   sudo -u postgres pg_dump -U postgres linklore > /tmp/linklore_backup.sql
   ```

2. **确认没有服务在使用该数据库**：
   - 检查 Docker 容器
   - 检查 PM2 进程
   - 检查其他应用连接

3. **删除后清理**：
   - 如果使用 Docker，确保 docker-compose.yml 中的配置已更新
   - 如果使用 PM2，确保环境变量已更新

## 常见错误

### 错误1：database is being accessed by other users

**解决方法**：
```sql
-- 终止所有连接
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'linklore';
```

### 错误2：permission denied

**解决方法**：
```bash
# 使用 postgres 超级用户
sudo -u postgres psql
```

### 错误3：database does not exist

**说明**：数据库可能已经被删除，刷新宝塔面板页面即可。

## 推荐操作流程

1. **停止所有使用数据库的服务**
2. **使用命令行方法删除**（方法2，最可靠）
3. **刷新宝塔面板页面**
4. **验证删除成功**

