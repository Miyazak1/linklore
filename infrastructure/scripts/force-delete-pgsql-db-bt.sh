#!/bin/bash
# 宝塔面板 PostgreSQL 数据库强制删除脚本

set -e

DB_NAME="linklore"
DB_USER="linklore"

echo "=========================================="
echo "宝塔面板 PostgreSQL 数据库强制删除"
echo "数据库名: $DB_NAME"
echo "=========================================="

# 查找宝塔面板的 PostgreSQL 配置
echo ""
echo "=== 查找宝塔面板 PostgreSQL 配置 ==="

# 常见位置
PGSQL_DIRS=(
    "/www/server/pgsql"
    "/www/server/postgresql"
    "/www/server/panel/data/pgsql"
)

PGSQL_DIR=""
for dir in "${PGSQL_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        PGSQL_DIR="$dir"
        echo "找到 PostgreSQL 目录: $PGSQL_DIR"
        break
    fi
done

if [ -z "$PGSQL_DIR" ]; then
    echo "未找到宝塔面板 PostgreSQL 目录，尝试使用系统 PostgreSQL"
    PGSQL_DIR="/var/lib/postgresql"
fi

# 查找 PostgreSQL 数据目录
DATA_DIR=""
if [ -d "$PGSQL_DIR/data" ]; then
    DATA_DIR="$PGSQL_DIR/data"
elif [ -d "$PGSQL_DIR/main" ]; then
    DATA_DIR="$PGSQL_DIR/main"
else
    # 尝试从运行中的 PostgreSQL 获取
    DATA_DIR=$(ps aux | grep postgres | grep -oP '(-D|--pgdata=)\K[^\s]+' | head -1)
fi

echo "数据目录: $DATA_DIR"

# 查找 PostgreSQL 可执行文件
PGSQL_BIN=""
if [ -f "$PGSQL_DIR/bin/psql" ]; then
    PGSQL_BIN="$PGSQL_DIR/bin"
    export PATH="$PGSQL_BIN:$PATH"
elif [ -f "/usr/bin/psql" ]; then
    PGSQL_BIN="/usr/bin"
elif [ -f "/usr/local/bin/psql" ]; then
    PGSQL_BIN="/usr/local/bin"
fi

echo "PostgreSQL 可执行文件路径: $PGSQL_BIN"

# 查找 PostgreSQL 用户
PGSQL_USER=""
if id "postgres" &>/dev/null; then
    PGSQL_USER="postgres"
elif id "pgsql" &>/dev/null; then
    PGSQL_USER="pgsql"
else
    PGSQL_USER="postgres"
fi

echo "PostgreSQL 用户: $PGSQL_USER"

# 查找 PostgreSQL 端口
PGSQL_PORT="5432"
if [ -f "$DATA_DIR/postgresql.conf" ]; then
    PORT_LINE=$(grep "^port" "$DATA_DIR/postgresql.conf" 2>/dev/null | head -1)
    if [ ! -z "$PORT_LINE" ]; then
        PGSQL_PORT=$(echo "$PORT_LINE" | awk '{print $3}' | tr -d "'")
    fi
fi

echo "PostgreSQL 端口: $PGSQL_PORT"

# 查找 socket 目录
SOCKET_DIR=""
if [ -d "$DATA_DIR" ]; then
    SOCKET_DIR="$DATA_DIR"
elif [ -d "/tmp" ]; then
    SOCKET_DIR="/tmp"
else
    SOCKET_DIR="/var/run/postgresql"
fi

echo "Socket 目录: $SOCKET_DIR"

echo ""
echo "=== 方法1: 使用宝塔面板的 PostgreSQL 连接 ==="

# 尝试使用 socket 连接
if [ -d "$SOCKET_DIR" ]; then
    sudo -u $PGSQL_USER psql -h "$SOCKET_DIR" -p $PGSQL_PORT << EOF 2>&1 | tee /tmp/pgsql_delete.log
-- 查看所有数据库
\l

-- 查看目标数据库
SELECT datname, oid FROM pg_database WHERE datname = '$DB_NAME';

-- 终止所有连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME'
  AND pid <> pg_backend_pid();

-- 删除数据库
DROP DATABASE IF EXISTS $DB_NAME;

-- 删除用户
DROP USER IF EXISTS $DB_USER;

-- 验证删除
SELECT datname FROM pg_database WHERE datname = '$DB_NAME';
EOF
fi

# 检查是否成功
if ! sudo -u $PGSQL_USER psql -h "$SOCKET_DIR" -p $PGSQL_PORT -c "\l" 2>/dev/null | grep -q "$DB_NAME"; then
    echo "✓ 方法1成功：数据库已删除！"
    exit 0
fi

echo ""
echo "=== 方法2: 使用 localhost 连接 ==="

sudo -u $PGSQL_USER psql -h localhost -p $PGSQL_PORT << EOF 2>&1
-- 终止所有连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME'
  AND pid <> pg_backend_pid();

SELECT pg_sleep(1);

-- 删除数据库
DROP DATABASE IF EXISTS $DB_NAME;

-- 删除用户
DROP USER IF EXISTS $DB_USER;
EOF

if ! sudo -u $PGSQL_USER psql -h localhost -p $PGSQL_PORT -c "\l" 2>/dev/null | grep -q "$DB_NAME"; then
    echo "✓ 方法2成功：数据库已删除！"
    exit 0
fi

echo ""
echo "=== 方法3: 重启服务后删除 ==="

# 查找 PostgreSQL 服务名
SERVICE_NAME=""
if systemctl list-units | grep -q postgresql; then
    SERVICE_NAME="postgresql"
elif systemctl list-units | grep -q pgsql; then
    SERVICE_NAME="pgsql"
elif [ -f "/etc/init.d/postgresql" ]; then
    SERVICE_NAME="postgresql"
fi

if [ ! -z "$SERVICE_NAME" ]; then
    echo "重启服务: $SERVICE_NAME"
    systemctl restart $SERVICE_NAME 2>/dev/null || /etc/init.d/$SERVICE_NAME restart 2>/dev/null
    sleep 3
    
    sudo -u $PGSQL_USER psql -h localhost -p $PGSQL_PORT << EOF 2>&1
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;
EOF
fi

# 最终检查
echo ""
echo "=== 最终检查 ==="
echo "使用以下命令检查数据库列表："
echo "  sudo -u $PGSQL_USER psql -h localhost -p $PGSQL_PORT -c \"\\l\""

sudo -u $PGSQL_USER psql -h localhost -p $PGSQL_PORT -c "\l" 2>/dev/null | grep "$DB_NAME" && echo "❌ 数据库仍然存在" || echo "✓ 数据库已删除"

echo ""
echo "如果数据库仍然存在，请查看宝塔面板中的数据库管理页面"
echo "可能需要通过宝塔面板的界面手动删除"

