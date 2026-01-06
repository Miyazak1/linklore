# 使用终端编辑 pg_hba.conf

## 问题

宝塔面板文件管理器中可能看不到 `/var` 目录（系统目录）。

---

## 解决方案：使用终端直接修改

### 方法 1：使用 sed 命令（最简单，推荐）

```bash
# 1. 备份原文件
sudo cp /var/lib/pgsql/data/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf.bak

# 2. 修改认证方式
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

### 方法 2：使用 nano 编辑器

```bash
# 编辑文件
sudo nano /var/lib/pgsql/data/pg_hba.conf

# 找到包含 127.0.0.1/32 的行
# 将 ident 或 peer 改为 md5
# 保存：Ctrl + O，Enter，Ctrl + X

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 方法 3：使用 vi 编辑器

```bash
# 编辑文件
sudo vi /var/lib/pgsql/data/pg_hba.conf

# 按 i 进入编辑模式
# 找到包含 127.0.0.1/32 的行
# 将 ident 或 peer 改为 md5
# 按 Esc 退出编辑模式
# 输入 :wq 保存并退出

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

---

## 一键修复（推荐）

直接复制粘贴这个命令：

```bash
sudo cp /var/lib/pgsql/data/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf.bak && \
sudo sed -i 's/127.0.0.1\/32.*ident/127.0.0.1\/32            md5/g' /var/lib/pgsql/data/pg_hba.conf && \
sudo sed -i 's/127.0.0.1\/32.*peer/127.0.0.1\/32            md5/g' /var/lib/pgsql/data/pg_hba.conf && \
echo "✅ 修改完成！修改后的配置：" && \
sudo grep "127.0.0.1" /var/lib/pgsql/data/pg_hba.conf && \
echo "" && \
echo "🔄 重启 PostgreSQL..." && \
sudo systemctl restart postgresql && \
echo "✅ 重启完成！" && \
echo "" && \
echo "🧪 测试数据库连接..." && \
PGPASSWORD=Nuan2230543 psql -h 127.0.0.1 -U linklore_user -d linklore -c "SELECT 1;" && \
echo "" && \
echo "✅ 数据库连接成功！"
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

## 如果 sed 命令失败

可以手动查看和修改：

```bash
# 1. 查看文件内容
sudo cat /var/lib/pgsql/data/pg_hba.conf | grep "127.0.0.1"

# 2. 使用 nano 编辑
sudo nano /var/lib/pgsql/data/pg_hba.conf
```

在编辑器中：
- 找到包含 `127.0.0.1/32` 的行
- 将 `ident` 或 `peer` 改为 `md5`
- 保存并退出

---

## 重要提示

1. **使用 sudo**：修改系统文件需要 root 权限
2. **备份文件**：修改前已自动备份到 `.bak`
3. **重启服务**：修改后必须重启 PostgreSQL

---

## 下一步

执行一键修复命令后：

1. 验证配置已修改
2. 测试数据库连接
3. 重新运行 Prisma 迁移





















