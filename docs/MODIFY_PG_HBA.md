# 修改 pg_hba.conf 文件

## 文件位置

✅ 已找到：`/var/lib/pgsql/data/pg_hba.conf`

---

## 修改步骤

### 方法 1：使用 sed 命令（快速，推荐）

```bash
# 1. 备份原文件
sudo cp /var/lib/pgsql/data/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf.bak

# 2. 修改认证方式（将 ident 改为 md5）
sudo sed -i 's/127.0.0.1\/32.*ident/127.0.0.1\/32            md5/g' /var/lib/pgsql/data/pg_hba.conf
sudo sed -i 's/127.0.0.1\/32.*peer/127.0.0.1\/32            md5/g' /var/lib/pgsql/data/pg_hba.conf

# 3. 查看修改结果
echo "修改后的配置："
sudo grep "127.0.0.1" /var/lib/pgsql/data/pg_hba.conf

# 4. 重启 PostgreSQL
sudo systemctl restart postgresql

# 5. 测试连接
echo "测试数据库连接..."
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore -c "SELECT 1;"
```

### 方法 2：使用宝塔面板文件管理器

1. 进入 **文件** 菜单
2. 导航到：`/var/lib/pgsql/data/`
3. 找到 `pg_hba.conf` 文件
4. 点击文件名进行编辑
5. 找到包含 `127.0.0.1/32` 的行，类似：
   ```
   host    all             all             127.0.0.1/32            ident
   ```
   或
   ```
   host    all             all             127.0.0.1/32            peer
   ```
6. 将 `ident` 或 `peer` 改为 `md5`：
   ```
   host    all             all             127.0.0.1/32            md5
   ```
7. 保存文件
8. 在终端重启 PostgreSQL：
   ```bash
   sudo systemctl restart postgresql
   ```

### 方法 3：使用 nano 编辑器

```bash
# 编辑文件
sudo nano /var/lib/pgsql/data/pg_hba.conf

# 找到包含 127.0.0.1/32 的行
# 将 ident 或 peer 改为 md5
# 保存：Ctrl + O，Enter，Ctrl + X

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

---

## 一键修复（推荐）

直接复制粘贴以下命令：

```bash
# 备份并修改配置
sudo cp /var/lib/pgsql/data/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf.bak && \
sudo sed -i 's/127.0.0.1\/32.*ident/127.0.0.1\/32            md5/g' /var/lib/pgsql/data/pg_hba.conf && \
sudo sed -i 's/127.0.0.1\/32.*peer/127.0.0.1\/32            md5/g' /var/lib/pgsql/data/pg_hba.conf && \
echo "修改后的配置：" && \
sudo grep "127.0.0.1" /var/lib/pgsql/data/pg_hba.conf && \
echo "" && \
echo "重启 PostgreSQL..." && \
sudo systemctl restart postgresql && \
echo "测试数据库连接..." && \
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore -c "SELECT 1;"
```

---

## 验证修改

修改后，检查配置：

```bash
# 查看修改后的配置
sudo grep "127.0.0.1" /var/lib/pgsql/data/pg_hba.conf
```

应该看到：
```
host    all             all             127.0.0.1/32            md5
```

---

## 测试连接

修改并重启后，测试连接：

```bash
# 方法 1：使用环境变量（推荐）
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore -c "SELECT 1;"

# 方法 2：交互式输入密码
psql -h 127.0.0.1 -U linklore_user -d linklore
# 然后输入密码：Nuan2230543
```

如果成功，应该看到：
```
 ?column? 
----------
        1
(1 row)
```

---

## 如果修改失败

### 检查文件权限

```bash
# 检查文件权限
ls -la /var/lib/pgsql/data/pg_hba.conf

# 如果需要，修改权限
sudo chmod 600 /var/lib/pgsql/data/pg_hba.conf
sudo chown postgres:postgres /var/lib/pgsql/data/pg_hba.conf
```

### 查看完整文件内容

```bash
# 查看文件内容
sudo cat /var/lib/pgsql/data/pg_hba.conf
```

找到包含 `127.0.0.1` 的行，手动修改。

---

## 重要提示

1. **备份文件**：修改前先备份，如果出错可以恢复
2. **重启服务**：修改配置后必须重启 PostgreSQL
3. **测试连接**：确保修改后连接正常

---

## 下一步

修改并重启后：

1. 测试数据库连接
2. 重新运行 Prisma 迁移
3. 继续构建和部署















