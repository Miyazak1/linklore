# 数据库创建完成后的操作

## 当前状态

✅ 数据库 `linklore` 已存在  
✅ 用户 `linklore_user` 已创建  
✅ 密码：`Nuan2230543`  
✅ 权限已授予  

---

## 下一步：更新环境变量

### 方法 1：使用终端命令（快速）

```bash
# 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 添加或更新 DATABASE_URL
echo 'DATABASE_URL="postgresql://linklore_user:Nuan2230543@127.0.0.1:5432/linklore"' >> apps/web/.env.production

# 验证
cat apps/web/.env.production
```

**注意**：如果 `.env.production` 文件已存在且已有 `DATABASE_URL`，需要先编辑文件修改，而不是追加。

### 方法 2：使用宝塔面板文件管理器

1. 进入 **文件** 菜单
2. 导航到：`/www/wwwroot/www.linkloredu.com/apps/web/`
3. 找到 `.env.production` 文件
4. 点击文件名进行编辑
5. 添加或修改：

```bash
DATABASE_URL="postgresql://linklore_user:Nuan2230543@127.0.0.1:5432/linklore"
```

6. 点击 **保存**

---

## 完整的环境变量配置

如果文件还不完整，可以添加以下配置：

```bash
# 应用 URL（必须）
NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"

# 数据库连接（必须）
DATABASE_URL="postgresql://linklore_user:Nuan2230543@127.0.0.1:5432/linklore"

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

## 生成会话密钥（如果需要）

```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制生成的密钥，添加到 `SESSION_SECRET`。

---

## 重新运行部署脚本

环境变量更新后，重新运行部署脚本：

```bash
# 进入项目目录
cd /www/wwwroot/www.linkloredu.com

# 运行部署脚本
./infrastructure/scripts/deploy.sh
```

这次应该能成功连接数据库并完成迁移。

---

## 验证数据库连接

部署脚本运行后，检查是否成功：

```bash
# 查看 PM2 状态
pm2 status

# 查看日志（如果有错误）
pm2 logs linklore-web
```

---

## 如果还有问题

### 问题 1：环境变量未生效

确保文件路径正确：
```bash
cat apps/web/.env.production
```

### 问题 2：数据库连接失败

测试数据库连接：
```bash
psql -h 127.0.0.1 -U linklore_user -d linklore
```

输入密码：`Nuan2230543`

### 问题 3：权限问题

如果连接失败，检查权限：
```bash
sudo -u postgres psql
\du linklore_user
\l linklore
\q
```

---

## 完成检查清单

- [x] 数据库已创建
- [x] 用户已创建（密码：`Nuan2230543`）
- [x] 权限已授予
- [ ] 环境变量已更新（`DATABASE_URL`）
- [ ] 部署脚本已重新运行
- [ ] PM2 服务已启动
- [ ] 网站可以正常访问

---

## 快速操作

执行以下命令，快速完成配置：

```bash
cd /www/wwwroot/www.linkloredu.com && \
echo 'DATABASE_URL="postgresql://linklore_user:Nuan2230543@127.0.0.1:5432/linklore"' >> apps/web/.env.production && \
cat apps/web/.env.production && \
echo "" && \
echo "环境变量已更新，现在运行部署脚本：" && \
./infrastructure/scripts/deploy.sh
```

---

## 重要提示

1. **密码安全**：密码 `Nuan2230543` 已设置，请妥善保管
2. **环境变量格式**：`postgresql://用户名:密码@地址:端口/数据库名`
3. **如果文件已存在**：需要编辑文件修改，而不是追加















