#!/bin/bash
# PostgreSQL 数据库删除诊断脚本

echo "=========================================="
echo "PostgreSQL 数据库删除诊断工具"
echo "=========================================="

DB_NAME="linklore"
DB_USER="linklore"

echo ""
echo "=== 1. PostgreSQL 版本信息 ==="
sudo -u postgres psql --version 2>/dev/null || echo "无法获取版本信息"

echo ""
echo "=== 2. PostgreSQL 服务状态 ==="
systemctl status postgresql --no-pager 2>/dev/null | head -5 || /etc/init.d/postgresql status 2>/dev/null || echo "无法获取服务状态"

echo ""
echo "=== 3. 数据库列表 ==="
sudo -u postgres psql -c "\l" 2>/dev/null || echo "无法连接 PostgreSQL"

echo ""
echo "=== 4. 用户列表 ==="
sudo -u postgres psql -c "\du" 2>/dev/null || echo "无法获取用户列表"

echo ""
echo "=== 5. 目标数据库连接状态 ==="
sudo -u postgres psql -c "SELECT datname, usename, pid, state, query FROM pg_stat_activity WHERE datname = '$DB_NAME';" 2>/dev/null || echo "无法查询连接状态"

echo ""
echo "=== 6. 数据库详细信息 ==="
sudo -u postgres psql -c "SELECT oid, datname, datdba, encoding, datcollate, datctype FROM pg_database WHERE datname = '$DB_NAME';" 2>/dev/null || echo "无法获取数据库信息"

echo ""
echo "=== 7. 数据目录位置 ==="
sudo -u postgres psql -c "SHOW data_directory;" 2>/dev/null || echo "无法获取数据目录"

echo ""
echo "=== 8. 宝塔面板 PostgreSQL 目录 ==="
if [ -d "/www/server/pgsql" ]; then
    echo "找到目录: /www/server/pgsql"
    ls -la /www/server/pgsql/ | head -10
elif [ -d "/www/server/postgresql" ]; then
    echo "找到目录: /www/server/postgresql"
    ls -la /www/server/postgresql/ | head -10
else
    echo "未找到宝塔面板 PostgreSQL 目录"
fi

echo ""
echo "=== 9. 尝试强制删除 ==="
echo "正在尝试强制终止连接并删除..."

sudo -u postgres psql << EOF 2>&1
-- 终止所有连接到该数据库的会话
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME'
  AND pid <> pg_backend_pid();

-- 等待一下
SELECT pg_sleep(1);

-- 删除数据库
DROP DATABASE IF EXISTS $DB_NAME;

-- 删除用户
DROP USER IF EXISTS $DB_USER;

-- 验证删除
SELECT datname FROM pg_database WHERE datname = '$DB_NAME';
EOF

echo ""
echo "=== 10. 验证删除结果 ==="
sudo -u postgres psql -c "\l" | grep "$DB_NAME" && echo "数据库仍然存在！" || echo "数据库已成功删除！"

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="

