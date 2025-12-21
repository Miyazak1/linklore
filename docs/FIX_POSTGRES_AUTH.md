# 修复 PostgreSQL 认证配置

## 当前错误

```
psql: error: FATAL: Ident authentication failed for user "linklore_user"
```

**原因**：PostgreSQL 配置为使用 Ident 认证，但应该使用密码认证（md5 或 scram-sha-256）。

---

## 解决方案

### 第一步：找到并编辑 pg_hba.conf 文件

```bash
# 找到 pg_hba.conf 文件位置
sudo find / -name "pg_hba.conf" 2>/dev/null

# 通常在以下位置之一：
# - /var/lib/pgsql/data/pg_hba.conf
# - /etc/postgresql/*/main/pg_hba.conf
# - /usr/local/pgsql/data/pg_hba.conf
```

### 第二步：修改认证方式

编辑 `pg_hba.conf` 文件：

```bash
# 使用 nano 编辑（如果找到了文件）
sudo nano /var/lib/pgsql/data/pg_hba.conf
# 或使用宝塔面板文件管理器编辑
```

找到以下行（通常在文件末尾）：

```
# IPv4 local connections:
host    all             all             127.0.0.1/32            ident
```

修改为：

```
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
```

或者更安全的：

```
# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256
```

### 第三步：重启 PostgreSQL 服务

```bash
# 重启 PostgreSQL
sudo systemctl restart postgresql

# 检查服务状态
sudo systemctl status postgresql
```

### 第四步：测试连接

```bash
# 测试连接（会提示输入密码）
psql -h 127.0.0.1 -U linklore_user -d linklore
```

输入密码：`Nuan2230543`

---

## 快速修复（推荐）

### 方法 1：使用 sed 命令快速修改

```bash
# 找到 pg_hba.conf 文件
PG_HBA=$(sudo find / -name "pg_hba.conf" 2>/dev/null | head -1)

# 备份原文件
sudo cp "$PG_HBA" "$PG_HBA.bak"

# 修改认证方式（将 ident 改为 md5）
sudo sed -i 's/127.0.0.1\/32.*ident/127.0.0.1\/32            md5/g' "$PG_HBA"
sudo sed -i 's/127.0.0.1\/32.*peer/127.0.0.1\/32            md5/g' "$PG_HBA"

# 重启 PostgreSQL
sudo systemctl restart postgresql

# 测试连接
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore -c "SELECT 1;"
```

### 方法 2：手动编辑（如果方法 1 失败）

1. 找到 `pg_hba.conf` 文件：
   ```bash
   sudo find / -name "pg_hba.conf" 2>/dev/null
   ```

2. 使用宝塔面板文件管理器或 nano 编辑文件

3. 找到类似这样的行：
   ```
   host    all             all             127.0.0.1/32            ident
   ```
   或
   ```
   host    all             all             127.0.0.1/32            peer
   ```

4. 修改为：
   ```
   host    all             all             127.0.0.1/32            md5
   ```

5. 保存文件

6. 重启 PostgreSQL：
   ```bash
   sudo systemctl restart postgresql
   ```

---

## 验证配置

### 检查 pg_hba.conf 配置

```bash
# 查看配置
sudo grep "127.0.0.1" /var/lib/pgsql/data/pg_hba.conf
# 或使用找到的文件路径
```

应该看到：
```
host    all             all             127.0.0.1/32            md5
```

### 测试连接

```bash
# 使用环境变量设置密码（避免交互式输入）
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore -c "SELECT 1;"
```

如果成功，应该看到：
```
 ?column? 
----------
        1
(1 row)
```

---

## 如果找不到 pg_hba.conf 文件

### 查找 PostgreSQL 数据目录

```bash
# 查找 PostgreSQL 数据目录
sudo -u postgres psql -c "SHOW data_directory;"
```

数据目录通常是：
- `/var/lib/pgsql/data/`
- `/var/lib/postgresql/*/main/`

`pg_hba.conf` 文件在数据目录中。

---

## 完整的修复流程

```bash
# 1. 找到 pg_hba.conf
PG_HBA=$(sudo find / -name "pg_hba.conf" 2>/dev/null | head -1)
echo "找到文件: $PG_HBA"

# 2. 备份
sudo cp "$PG_HBA" "$PG_HBA.bak"

# 3. 修改认证方式
sudo sed -i 's/127.0.0.1\/32.*ident/127.0.0.1\/32            md5/g' "$PG_HBA"
sudo sed -i 's/127.0.0.1\/32.*peer/127.0.0.1\/32            md5/g' "$PG_HBA"

# 4. 查看修改结果
echo "修改后的配置："
sudo grep "127.0.0.1" "$PG_HBA"

# 5. 重启 PostgreSQL
sudo systemctl restart postgresql

# 6. 测试连接
echo "测试数据库连接..."
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore -c "SELECT 1;"
```

---

## 重要提示

1. **备份配置文件**：修改前先备份 `pg_hba.conf`
2. **重启服务**：修改配置后必须重启 PostgreSQL
3. **测试连接**：确保修改后连接正常

---

## 下一步

修复认证配置后：

1. 测试数据库连接
2. 重新运行 Prisma 迁移
3. 继续构建和部署

---

## 如果还是失败

检查 PostgreSQL 日志：

```bash
# 查看 PostgreSQL 日志
sudo tail -f /var/log/postgresql/postgresql-*.log
# 或
sudo journalctl -u postgresql -f
```











