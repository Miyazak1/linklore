# 宝塔面板删除 PostgreSQL 数据库 - 高级解决方案

## 深度排查步骤

### 步骤1：检查具体错误信息

**在宝塔面板中**：
1. 点击删除按钮时，查看浏览器控制台的错误信息（F12）
2. 或者查看宝塔面板的日志文件

**在终端中**：
```bash
# 查看 PostgreSQL 日志
tail -f /www/server/pgsql/logs/*.log
# 或者
tail -f /var/log/postgresql/*.log
```

### 步骤2：检查数据库状态和连接

```bash
# 1. 检查 PostgreSQL 服务状态
systemctl status postgresql
# 或者
/etc/init.d/postgresql status

# 2. 查看所有数据库连接
sudo -u postgres psql -c "SELECT datname, usename, pid, state FROM pg_stat_activity WHERE datname = 'linklore';"

# 3. 查看数据库详细信息
sudo -u postgres psql -c "\l linklore"

# 4. 查看用户信息
sudo -u postgres psql -c "\du linklore"
```

### 步骤3：强制终止所有连接

```bash
# 方法1：使用 SQL 命令
sudo -u postgres psql << 'EOF'
-- 查看所有连接
SELECT pid, usename, datname, state, query 
FROM pg_stat_activity 
WHERE datname = 'linklore';

-- 强制终止所有连接（包括自己的连接）
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'linklore';
EOF

# 方法2：重启 PostgreSQL 服务（会断开所有连接）
systemctl restart postgresql
# 或者
/etc/init.d/postgresql restart

# 然后立即删除
sudo -u postgres psql -c "DROP DATABASE IF EXISTS linklore;"
sudo -u postgres psql -c "DROP USER IF EXISTS linklore;"
```

### 步骤4：检查宝塔面板的 PostgreSQL 管理方式

宝塔面板可能使用特殊的 PostgreSQL 配置，需要检查：

```bash
# 1. 查找 PostgreSQL 安装目录
find /www -name "postgresql.conf" 2>/dev/null
find /www -name "pg_hba.conf" 2>/dev/null

# 2. 查看宝塔面板的 PostgreSQL 配置
ls -la /www/server/pgsql/
# 或者
ls -la /www/server/postgresql/

# 3. 查看宝塔面板的数据库管理脚本
find /www -name "*pgsql*" -type f 2>/dev/null | head -10
```

### 步骤5：直接操作数据库文件（最后手段）

**警告**：此方法需要停止 PostgreSQL 服务，请谨慎操作！

```bash
# 1. 停止 PostgreSQL 服务
systemctl stop postgresql
# 或者
/etc/init.d/postgresql stop

# 2. 查找数据库文件位置
sudo -u postgres psql -c "SHOW data_directory;"
# 通常位置：/www/server/pgsql/data 或 /var/lib/postgresql/

# 3. 备份数据库文件（如果需要）
DATA_DIR=$(sudo -u postgres psql -t -c "SHOW data_directory;" | xargs)
cp -r $DATA_DIR/base /tmp/pgsql_base_backup

# 4. 查找数据库的 OID
sudo -u postgres psql -c "SELECT oid, datname FROM pg_database WHERE datname = 'linklore';"

# 5. 删除数据库目录（需要知道 OID）
# 先获取 OID
DB_OID=$(sudo -u postgres psql -t -c "SELECT oid FROM pg_database WHERE datname = 'linklore';" | xargs)
echo "数据库 OID: $DB_OID"

# 6. 启动 PostgreSQL（先不删除文件，测试连接）
systemctl start postgresql

# 7. 如果启动成功，再次尝试删除
sudo -u postgres psql << 'EOF'
-- 终止所有连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'linklore';

-- 删除数据库
DROP DATABASE IF EXISTS linklore;

-- 删除用户
DROP USER IF EXISTS linklore;
EOF
```

### 步骤6：使用宝塔面板的 API 或命令行工具

```bash
# 查找宝塔面板的命令行工具
find /www/server/panel -name "*pgsql*" -o -name "*postgres*" 2>/dev/null

# 查看宝塔面板的 Python 脚本
ls -la /www/server/panel/class/
# 可能有数据库管理相关的 Python 脚本
```

### 步骤7：检查文件权限

```bash
# 检查 PostgreSQL 数据目录权限
ls -la /www/server/pgsql/data/
# 或者
ls -la /var/lib/postgresql/

# 检查是否有锁文件
find /www/server/pgsql/data -name "*.lock" 2>/dev/null
find /tmp -name "*postgres*" -o -name "*pgsql*" 2>/dev/null
```

### 步骤8：完全重置（终极方案）

如果以上方法都不行，可以考虑：

```bash
# 1. 备份所有重要数据
sudo -u postgres pg_dumpall > /tmp/all_databases_backup.sql

# 2. 停止 PostgreSQL
systemctl stop postgresql

# 3. 删除数据库文件（危险操作！）
# 先确认数据库 OID
DB_OID=$(sudo -u postgres psql -t -c "SELECT oid FROM pg_database WHERE datname = 'linklore';" 2>/dev/null | xargs)
if [ ! -z "$DB_OID" ]; then
    DATA_DIR=$(sudo -u postgres psql -t -c "SHOW data_directory;" 2>/dev/null | xargs)
    echo "准备删除: $DATA_DIR/base/$DB_OID"
    # 实际删除（取消注释以执行）
    # rm -rf $DATA_DIR/base/$DB_OID
fi

# 4. 启动 PostgreSQL
systemctl start postgresql

# 5. 清理系统表
sudo -u postgres psql << 'EOF'
-- 从系统表中删除记录（如果文件已删除）
DELETE FROM pg_database WHERE datname = 'linklore';
DELETE FROM pg_authid WHERE rolname = 'linklore';
EOF
```

## 推荐操作流程

按顺序尝试：

1. **先检查错误信息**（步骤1）
2. **强制终止连接并重启服务**（步骤3）
3. **如果还不行，检查宝塔面板的特殊配置**（步骤4）
4. **最后手段：直接操作文件**（步骤5）

## 获取帮助信息

执行以下命令，把输出结果发给我，我可以帮你分析：

```bash
# 收集诊断信息
echo "=== PostgreSQL 版本 ==="
sudo -u postgres psql --version

echo "=== 服务状态 ==="
systemctl status postgresql | head -10

echo "=== 数据库列表 ==="
sudo -u postgres psql -c "\l"

echo "=== 用户列表 ==="
sudo -u postgres psql -c "\du"

echo "=== 连接状态 ==="
sudo -u postgres psql -c "SELECT datname, usename, pid, state FROM pg_stat_activity WHERE datname = 'linklore';"

echo "=== 数据目录 ==="
sudo -u postgres psql -c "SHOW data_directory;"

echo "=== 宝塔面板 PostgreSQL 目录 ==="
ls -la /www/server/pgsql/ 2>/dev/null || ls -la /www/server/postgresql/ 2>/dev/null || echo "未找到"
```

