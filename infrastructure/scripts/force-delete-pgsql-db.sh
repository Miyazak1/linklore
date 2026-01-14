#!/bin/bash
# 强制删除 PostgreSQL 数据库脚本

set -e

DB_NAME="linklore"
DB_USER="linklore"

echo "=========================================="
echo "强制删除 PostgreSQL 数据库: $DB_NAME"
echo "=========================================="

# 方法1：重启服务后立即删除
echo ""
echo "方法1: 重启服务后立即删除..."
systemctl restart postgresql 2>/dev/null || /etc/init.d/postgresql restart 2>/dev/null
sleep 2

sudo -u postgres psql << EOF 2>&1
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;
EOF

# 检查是否成功
if ! sudo -u postgres psql -c "\l" 2>/dev/null | grep -q "$DB_NAME"; then
    echo "✓ 方法1成功：数据库已删除！"
    exit 0
fi

echo "方法1失败，尝试方法2..."

# 方法2：强制终止所有连接后删除
echo ""
echo "方法2: 强制终止所有连接..."
sudo -u postgres psql << EOF 2>&1
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME'
  AND pid <> pg_backend_pid();

SELECT pg_sleep(2);

DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;
EOF

# 检查是否成功
if ! sudo -u postgres psql -c "\l" 2>/dev/null | grep -q "$DB_NAME"; then
    echo "✓ 方法2成功：数据库已删除！"
    exit 0
fi

echo "方法2失败，尝试方法3..."

# 方法3：单用户模式删除
echo ""
echo "方法3: 单用户模式删除..."

# 查找数据目录
DATA_DIR=$(sudo -u postgres psql -t -c "SHOW data_directory;" 2>/dev/null | xargs)
if [ -z "$DATA_DIR" ]; then
    # 尝试常见位置
    if [ -d "/www/server/pgsql/data" ]; then
        DATA_DIR="/www/server/pgsql/data"
    elif [ -d "/www/server/postgresql/data" ]; then
        DATA_DIR="/www/server/postgresql/data"
    elif [ -d "/var/lib/postgresql" ]; then
        DATA_DIR="/var/lib/postgresql/$(ls /var/lib/postgresql | head -1)/main"
    else
        echo "无法找到 PostgreSQL 数据目录"
        exit 1
    fi
fi

echo "数据目录: $DATA_DIR"

# 停止服务
systemctl stop postgresql 2>/dev/null || /etc/init.d/postgresql stop 2>/dev/null

# 单用户模式删除
sudo -u postgres postgres --single -D "$DATA_DIR" postgres << EOF 2>&1
DROP DATABASE $DB_NAME;
DROP USER $DB_USER;
EOF

# 启动服务
systemctl start postgresql 2>/dev/null || /etc/init.d/postgresql start 2>/dev/null
sleep 2

# 检查是否成功
if ! sudo -u postgres psql -c "\l" 2>/dev/null | grep -q "$DB_NAME"; then
    echo "✓ 方法3成功：数据库已删除！"
    exit 0
fi

echo "方法3失败，尝试方法4（直接操作系统表）..."

# 方法4：直接操作系统表
echo ""
echo "方法4: 直接操作系统表..."

systemctl stop postgresql 2>/dev/null || /etc/init.d/postgresql stop 2>/dev/null

sudo -u postgres postgres --single -D "$DATA_DIR" postgres << EOF 2>&1
DELETE FROM pg_database WHERE datname = '$DB_NAME';
DELETE FROM pg_authid WHERE rolname = '$DB_USER';
VACUUM;
EOF

systemctl start postgresql 2>/dev/null || /etc/init.d/postgresql start 2>/dev/null
sleep 2

# 检查是否成功
if ! sudo -u postgres psql -c "\l" 2>/dev/null | grep -q "$DB_NAME"; then
    echo "✓ 方法4成功：数据库已删除！"
    exit 0
fi

echo "方法4失败，尝试方法5（手动删除文件）..."

# 方法5：手动删除数据库文件
echo ""
echo "方法5: 手动删除数据库文件..."

# 获取数据库 OID
DB_OID=$(sudo -u postgres psql -t -c "SELECT oid FROM pg_database WHERE datname = '$DB_NAME';" 2>/dev/null | xargs)

if [ ! -z "$DB_OID" ] && [ -d "$DATA_DIR/base/$DB_OID" ]; then
    echo "找到数据库目录: $DATA_DIR/base/$DB_OID"
    echo "正在删除..."
    
    systemctl stop postgresql 2>/dev/null || /etc/init.d/postgresql stop 2>/dev/null
    
    # 备份（可选）
    # cp -r "$DATA_DIR/base/$DB_OID" "/tmp/pgsql_${DB_NAME}_backup_$(date +%Y%m%d_%H%M%S)"
    
    # 删除目录
    rm -rf "$DATA_DIR/base/$DB_OID"
    
    # 从系统表删除
    sudo -u postgres postgres --single -D "$DATA_DIR" postgres << EOF 2>&1
DELETE FROM pg_database WHERE datname = '$DB_NAME';
DELETE FROM pg_authid WHERE rolname = '$DB_USER';
VACUUM;
EOF
    
    systemctl start postgresql 2>/dev/null || /etc/init.d/postgresql start 2>/dev/null
    sleep 2
fi

# 最终检查
echo ""
echo "=========================================="
echo "最终检查结果："
echo "=========================================="

if sudo -u postgres psql -c "\l" 2>/dev/null | grep -q "$DB_NAME"; then
    echo "❌ 删除失败：数据库仍然存在"
    echo ""
    echo "请执行诊断脚本查看详细信息："
    echo "  ./infrastructure/scripts/diagnose-pgsql-delete.sh"
    exit 1
else
    echo "✓ 删除成功：数据库已不存在"
    echo ""
    echo "请刷新宝塔面板页面查看结果"
    exit 0
fi

