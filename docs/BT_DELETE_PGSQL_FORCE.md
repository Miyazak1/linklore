# 强制删除 PostgreSQL 数据库 - 终极方案

## 方案A：重启服务后立即删除（最有效）

```bash
# 1. 重启 PostgreSQL 服务（会断开所有连接）
systemctl restart postgresql
# 或者
/etc/init.d/postgresql restart

# 2. 等待2秒让服务完全启动
sleep 2

# 3. 立即删除（在连接建立之前）
sudo -u postgres psql << 'EOF'
-- 删除数据库
DROP DATABASE IF EXISTS linklore;

-- 删除用户
DROP USER IF EXISTS linklore;
EOF

# 4. 验证
sudo -u postgres psql -c "\l" | grep linklore
```

## 方案B：使用单用户模式删除

```bash
# 1. 停止 PostgreSQL
systemctl stop postgresql

# 2. 查找 PostgreSQL 数据目录
DATA_DIR=$(sudo -u postgres psql -c "SHOW data_directory;" 2>/dev/null | xargs)
# 或者手动指定
# DATA_DIR="/www/server/pgsql/data"

# 3. 以单用户模式启动 PostgreSQL
sudo -u postgres postgres --single -D $DATA_DIR << 'EOF'
DROP DATABASE linklore;
DROP USER linklore;
EOF

# 4. 正常启动 PostgreSQL
systemctl start postgresql
```

## 方案C：直接修改系统表（最彻底）

```bash
# 1. 停止 PostgreSQL
systemctl stop postgresql

# 2. 启动 PostgreSQL（单用户模式）
DATA_DIR="/www/server/pgsql/data"  # 根据实际情况修改
sudo -u postgres postgres --single -D $DATA_DIR postgres << 'EOF'
-- 从系统表中删除数据库记录
DELETE FROM pg_database WHERE datname = 'linklore';
DELETE FROM pg_authid WHERE rolname = 'linklore';
EOF

# 3. 正常启动 PostgreSQL
systemctl start postgresql

# 4. 清理数据库文件（可选，如果还有残留）
# 先获取数据库 OID
DB_OID=$(sudo -u postgres psql -t -c "SELECT oid FROM pg_database WHERE datname = 'linklore';" 2>/dev/null | xargs)
if [ -z "$DB_OID" ]; then
    echo "数据库已从系统表中删除"
    # 手动查找并删除数据库目录
    find $DATA_DIR/base -type d -name "*" | xargs ls -ld | grep linklore
fi
```

## 方案D：通过宝塔面板的 Python API

```bash
# 查找宝塔面板的数据库管理脚本
cd /www/server/panel

# 使用宝塔面板的 Python 脚本删除
python3 << 'EOF'
import sys
sys.path.insert(0, '/www/server/panel')
import public

# 尝试删除数据库
try:
    result = public.ExecShell("sudo -u postgres psql -c \"DROP DATABASE IF EXISTS linklore;\"")
    print(result)
except Exception as e:
    print(f"错误: {e}")
EOF
```

## 方案E：完全手动删除（最后手段）

```bash
# 1. 停止 PostgreSQL
systemctl stop postgresql

# 2. 备份（以防万一）
sudo -u postgres pg_dumpall > /tmp/pgsql_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. 查找数据库 OID
DATA_DIR="/www/server/pgsql/data"  # 根据实际情况修改
DB_OID=$(sudo -u postgres psql -t -c "SELECT oid FROM pg_database WHERE datname = 'linklore';" 2>/dev/null | xargs)

if [ ! -z "$DB_OID" ]; then
    echo "数据库 OID: $DB_OID"
    echo "准备删除目录: $DATA_DIR/base/$DB_OID"
    
    # 4. 删除数据库目录
    if [ -d "$DATA_DIR/base/$DB_OID" ]; then
        rm -rf "$DATA_DIR/base/$DB_OID"
        echo "数据库目录已删除"
    fi
fi

# 5. 编辑系统表（使用单用户模式）
sudo -u postgres postgres --single -D $DATA_DIR postgres << 'EOF'
DELETE FROM pg_database WHERE datname = 'linklore';
DELETE FROM pg_authid WHERE rolname = 'linklore';
VACUUM;
EOF

# 6. 启动 PostgreSQL
systemctl start postgresql

# 7. 验证
sudo -u postgres psql -c "\l" | grep linklore || echo "删除成功！"
```

## 推荐执行顺序

1. **先试方案A**（最简单，通常有效）
2. **如果不行，试方案B**（单用户模式）
3. **最后用方案E**（完全手动删除）

## 执行诊断脚本

先运行诊断脚本查看具体情况：

```bash
cd /www/wwwroot/linklore
chmod +x infrastructure/scripts/diagnose-pgsql-delete.sh
./infrastructure/scripts/diagnose-pgsql-delete.sh
```

把输出结果发给我，我可以帮你分析具体问题。

