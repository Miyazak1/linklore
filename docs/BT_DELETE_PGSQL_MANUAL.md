# 宝塔面板 PostgreSQL 数据库手动删除指南

## 问题说明

如果脚本提示"数据库不存在"但宝塔面板中还能看到，可能是：
1. 脚本连接到了错误的 PostgreSQL 实例
2. 宝塔面板使用了特殊的 PostgreSQL 配置
3. 有多个 PostgreSQL 实例在运行

## 解决方案

### 方案1：通过宝塔面板界面删除（最简单）

1. **登录宝塔面板**
2. **进入数据库** → **PgSQL**
3. **找到要删除的数据库**（用户名：`linklore`）
4. **点击操作列中的"删除"按钮**
5. **如果删除失败，继续下面的方法**

### 方案2：查找正确的 PostgreSQL 实例

在宝塔面板终端执行：

```bash
# 1. 查找所有 PostgreSQL 进程
ps aux | grep postgres

# 2. 查找 PostgreSQL 数据目录
find /www -name "postgresql.conf" 2>/dev/null
find /www -name "pg_hba.conf" 2>/dev/null

# 3. 查找 PostgreSQL 端口
netstat -tlnp | grep postgres

# 4. 查看宝塔面板的 PostgreSQL 配置
ls -la /www/server/pgsql/
cat /www/server/pgsql/version.pl 2>/dev/null
```

### 方案3：使用宝塔面板的数据库管理工具

```bash
# 查找宝塔面板的数据库管理脚本
find /www/server/panel -name "*pgsql*" -o -name "*postgres*" 2>/dev/null

# 查看宝塔面板的数据库配置
cat /www/server/panel/data/db_name.pl 2>/dev/null
```

### 方案4：直接连接宝塔面板的 PostgreSQL

```bash
# 1. 查找宝塔面板 PostgreSQL 的 socket 文件
find /www/server/pgsql -name ".s.PGSQL.*" 2>/dev/null
find /tmp -name ".s.PGSQL.*" 2>/dev/null

# 2. 使用 socket 连接
# 假设 socket 在 /tmp/.s.PGSQL.5432
sudo -u postgres psql -h /tmp -p 5432 << 'EOF'
\l
DROP DATABASE IF EXISTS linklore;
DROP USER IF EXISTS linklore;
\q
EOF
```

### 方案5：通过宝塔面板 API 删除

```bash
# 查找宝塔面板的 API 密钥
BT_PANEL_KEY=$(cat /www/server/panel/data/admin_path.pl 2>/dev/null | cut -d'/' -f2)
BT_PANEL_URL="http://127.0.0.1:$(cat /www/server/panel/data/port.pl 2>/dev/null)/"

# 使用宝塔面板 API 删除（需要 API 密钥）
# 具体 API 调用方式需要查看宝塔面板文档
```

### 方案6：手动编辑数据库文件（最后手段）

```bash
# 1. 停止 PostgreSQL
systemctl stop postgresql
# 或者
/etc/init.d/postgresql stop

# 2. 查找数据库文件
DATA_DIR="/www/server/pgsql/data"  # 根据实际情况修改
cd $DATA_DIR/base

# 3. 查找数据库 OID
# 需要先知道数据库名对应的 OID
# 可以通过查看 pg_database 系统表获取

# 4. 备份（可选）
cp -r $DATA_DIR/base /tmp/pgsql_backup_$(date +%Y%m%d_%H%M%S)

# 5. 使用单用户模式删除
sudo -u postgres postgres --single -D $DATA_DIR postgres << 'EOF'
DELETE FROM pg_database WHERE datname = 'linklore';
DELETE FROM pg_authid WHERE rolname = 'linklore';
VACUUM;
EOF

# 6. 启动 PostgreSQL
systemctl start postgresql
```

## 推荐操作流程

1. **先尝试方案1**（通过宝塔面板界面删除）
2. **如果失败，运行诊断脚本**：
   ```bash
   cd /www/wwwroot/linklore
   chmod +x infrastructure/scripts/diagnose-pgsql-delete.sh
   ./infrastructure/scripts/diagnose-pgsql-delete.sh
   ```
3. **使用宝塔专用删除脚本**：
   ```bash
   chmod +x infrastructure/scripts/force-delete-pgsql-db-bt.sh
   ./infrastructure/scripts/force-delete-pgsql-db-bt.sh
   ```
4. **如果还是不行，手动查找并连接正确的 PostgreSQL 实例**（方案2-4）

## 获取详细信息

执行以下命令，把输出结果发给我：

```bash
echo "=== PostgreSQL 进程 ==="
ps aux | grep postgres | grep -v grep

echo ""
echo "=== PostgreSQL 端口 ==="
netstat -tlnp | grep postgres

echo ""
echo "=== 宝塔面板 PostgreSQL 目录 ==="
ls -la /www/server/pgsql/ 2>/dev/null

echo ""
echo "=== 数据库列表（使用 postgres 用户）==="
sudo -u postgres psql -c "\l" 2>&1

echo ""
echo "=== 数据库列表（使用 pgsql 用户）==="
sudo -u pgsql psql -c "\l" 2>&1 || echo "pgsql 用户不存在"

echo ""
echo "=== 查找 socket 文件 ==="
find /tmp -name ".s.PGSQL.*" 2>/dev/null
find /www/server/pgsql -name ".s.PGSQL.*" 2>/dev/null
```

