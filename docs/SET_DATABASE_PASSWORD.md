# 设置数据库密码

## 关于"你的密码"

"你的密码"是指**你需要自己设置的密码**，不是系统已有的密码。

这个密码用于：
- 数据库用户 `linklore_user` 的登录密码
- 需要配置在环境变量 `DATABASE_URL` 中

---

## 密码要求

### 建议使用强密码：

- **长度**：至少 8 个字符（建议 12-16 个字符）
- **包含**：大小写字母、数字、特殊字符
- **示例**：`LinkLore2024!@#`、`MyDbPass123!`

### 不推荐使用：

- 简单密码：`123456`、`password`、`admin`
- 个人信息：生日、姓名等
- 常见密码：`qwerty`、`abc123` 等

---

## 完整操作步骤

### 第一步：设置一个密码

**示例密码**（你可以使用，但建议改成自己的）：
- `LinkLore2024!@#`
- `MySecurePass123!`
- `LinkLore_DB_2024`

**重要**：记住这个密码，后面需要配置到环境变量中！

---

### 第二步：创建数据库和用户

在 PostgreSQL 命令行中执行（替换 `你的密码` 为你设置的密码）：

```sql
-- 创建数据库
CREATE DATABASE linklore;

-- 创建用户并设置密码（替换 '你的密码' 为你设置的密码）
CREATE USER linklore_user WITH PASSWORD 'LinkLore2024!@#';

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE linklore TO linklore_user;

-- 退出
\q
```

**示例**（如果你使用密码 `LinkLore2024!@#`）：

```sql
CREATE DATABASE linklore;
CREATE USER linklore_user WITH PASSWORD 'LinkLore2024!@#';
GRANT ALL PRIVILEGES ON DATABASE linklore TO linklore_user;
\q
```

---

### 第三步：更新环境变量

创建好数据库后，需要更新环境变量文件：

```bash
# 编辑环境变量文件
nano apps/web/.env.production
# 或者使用宝塔面板文件管理器编辑
```

添加或修改 `DATABASE_URL`（使用你设置的密码）：

```bash
DATABASE_URL="postgresql://linklore_user:LinkLore2024!@#@127.0.0.1:5432/linklore"
```

**格式说明**：
- `linklore_user` = 用户名
- `LinkLore2024!@#` = 你设置的密码（替换成你的实际密码）
- `127.0.0.1:5432` = 数据库地址和端口
- `linklore` = 数据库名

---

## 完整示例

假设你设置的密码是 `MySecurePass123!`：

### 1. 创建数据库和用户

```sql
CREATE DATABASE linklore;
CREATE USER linklore_user WITH PASSWORD 'MySecurePass123!';
GRANT ALL PRIVILEGES ON DATABASE linklore TO linklore_user;
\q
```

### 2. 更新环境变量

```bash
DATABASE_URL="postgresql://linklore_user:MySecurePass123!@127.0.0.1:5432/linklore"
```

---

## 快速操作

### 如果你使用密码 `LinkLore2024!@#`：

```bash
# 1. 进入 PostgreSQL
sudo -u postgres psql

# 2. 执行以下 SQL（直接复制粘贴）
CREATE DATABASE linklore;
CREATE USER linklore_user WITH PASSWORD 'LinkLore2024!@#';
GRANT ALL PRIVILEGES ON DATABASE linklore TO linklore_user;
\q

# 3. 更新环境变量
echo 'DATABASE_URL="postgresql://linklore_user:LinkLore2024!@#@127.0.0.1:5432/linklore"' >> apps/web/.env.production

# 4. 验证
cat apps/web/.env.production
```

---

## 重要提示

1. **记住密码**：这个密码需要配置到环境变量中，一定要记住
2. **使用强密码**：建议使用包含大小写字母、数字、特殊字符的密码
3. **不要泄露**：这是数据库密码，不要泄露给他人
4. **环境变量格式**：`postgresql://用户名:密码@地址:端口/数据库名`

---

## 如果忘记密码

如果忘记密码，可以重置：

```bash
# 进入 PostgreSQL
sudo -u postgres psql

# 修改密码
ALTER USER linklore_user WITH PASSWORD '新密码';

# 退出
\q
```

然后更新环境变量中的密码。

---

## 下一步

设置好密码并创建数据库后：

1. 更新环境变量 `DATABASE_URL`
2. 重新运行部署脚本
3. 验证数据库连接















