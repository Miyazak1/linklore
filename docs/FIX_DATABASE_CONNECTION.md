# 修复数据库连接问题

## 当前错误

```
Error: P1001: Can't reach database server at '127.0.0.1:5432'
```

**原因**：PostgreSQL 数据库服务器没有运行或无法连接。

---

## 解决方案

### 方案 1：使用阿里云 RDS PostgreSQL（推荐）

如果你已经购买了阿里云 RDS PostgreSQL：

1. **获取数据库连接信息**：
   - 登录阿里云控制台
   - 进入 RDS 管理
   - 找到你的 PostgreSQL 实例
   - 获取：主机地址、端口、数据库名、用户名、密码

2. **更新环境变量**：

```bash
# 编辑环境变量文件
nano apps/web/.env.production
# 或者使用宝塔面板文件管理器编辑

# 添加或修改 DATABASE_URL
DATABASE_URL="postgresql://用户名:密码@RDS主机地址:5432/linklore?sslmode=require"
```

3. **重新运行部署脚本**：

```bash
cd /www/wwwroot/www.linkloredu.com
./infrastructure/scripts/deploy.sh
```

---

### 方案 2：安装本地 PostgreSQL（如果还没购买 RDS）

#### 2.1 安装 PostgreSQL

```bash
# 安装 PostgreSQL
sudo dnf install -y postgresql-server postgresql

# 初始化数据库
sudo postgresql-setup --initdb

# 启动 PostgreSQL 服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 检查服务状态
sudo systemctl status postgresql
```

#### 2.2 创建数据库和用户

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 在 PostgreSQL 命令行中执行：
CREATE DATABASE linklore;
CREATE USER linklore_user WITH PASSWORD '你的密码';
GRANT ALL PRIVILEGES ON DATABASE linklore TO linklore_user;
\q
```

#### 2.3 更新环境变量

```bash
# 编辑环境变量文件
nano apps/web/.env.production

# 添加或修改 DATABASE_URL
DATABASE_URL="postgresql://linklore_user:你的密码@127.0.0.1:5432/linklore"
```

#### 2.4 重新运行部署脚本

```bash
cd /www/wwwroot/www.linkloredu.com
./infrastructure/scripts/deploy.sh
```

---

### 方案 3：暂时跳过数据库迁移（如果数据库还没准备好）

如果数据库还没配置好，可以暂时跳过迁移，先完成其他步骤：

```bash
# 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 手动执行部署步骤（跳过数据库迁移）
pnpm install
pnpm build

# 跳过 prisma migrate，直接启动服务
pm2 start ecosystem.config.js --env production
pm2 save
```

**注意**：这样应用可能无法正常工作，因为需要数据库。建议尽快配置数据库。

---

## 检查数据库连接

### 检查 PostgreSQL 是否运行

```bash
# 检查服务状态
sudo systemctl status postgresql

# 或者检查端口
netstat -tlnp | grep 5432
```

### 测试数据库连接

```bash
# 如果使用本地 PostgreSQL
psql -h 127.0.0.1 -U linklore_user -d linklore

# 如果使用 RDS
psql -h RDS主机地址 -U 用户名 -d linklore
```

---

## 环境变量配置示例

### 使用本地 PostgreSQL

```bash
DATABASE_URL="postgresql://linklore_user:密码@127.0.0.1:5432/linklore"
```

### 使用阿里云 RDS

```bash
DATABASE_URL="postgresql://用户名:密码@RDS主机地址:5432/linklore?sslmode=require"
```

---

## 完整的环境变量配置

如果还没有完整配置环境变量，可以参考：

```bash
# 应用 URL（必须）
NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"

# 数据库连接（必须）
DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/linklore?sslmode=require"

# 会话密钥（必须，至少32字符）
# 生成方式：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET="你的32位以上随机字符串"

# Redis 连接（如果已配置）
REDIS_URL="redis://:密码@Redis地址:6379/0"

# 阿里云 OSS 配置（如果已配置）
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="你的AccessKey ID"
OSS_ACCESS_KEY_SECRET="你的AccessKey Secret"
OSS_BUCKET="你的Bucket名称"
```

---

## 推荐操作流程

### 如果你有阿里云 RDS：

1. 获取 RDS 连接信息
2. 更新环境变量中的 `DATABASE_URL`
3. 重新运行部署脚本

### 如果你还没有数据库：

1. **选项 A**：购买阿里云 RDS PostgreSQL（推荐，更稳定）
2. **选项 B**：安装本地 PostgreSQL（见方案 2）
3. 配置环境变量
4. 重新运行部署脚本

---

## 重要提示

1. **数据库是必需的**：应用需要数据库才能正常运行
2. **推荐使用云数据库**：阿里云 RDS 更稳定，不需要自己维护
3. **环境变量必须正确**：`DATABASE_URL` 必须配置正确

---

## 下一步

根据你的情况选择：
- **有 RDS**：更新环境变量，重新运行部署脚本
- **没有数据库**：先安装或购买数据库，然后配置环境变量

告诉我你的情况，我继续指导。











