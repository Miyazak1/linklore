# 部署下一步操作指南

## 当前进度

✅ **已完成**：
- Node.js 20 已安装
- PM2 已安装
- 项目已克隆到服务器

⚠️ **待完成**：
- Nginx（通过宝塔面板安装）
- 环境变量配置
- 网站配置
- SSL 证书
- 启动服务

---

## 第一步：验证安装

在终端执行以下命令，确认所有工具已安装：

```bash
# 检查 Node.js
node --version
# 应该显示：v20.x.x

# 检查 npm
npm --version
# 应该显示：10.x.x 或更高

# 检查 PM2
pm2 --version
# 应该显示：5.x.x 或更高

# 检查 Nginx（如果已通过宝塔面板安装）
nginx -v
# 应该显示版本号，如果没有显示，需要通过宝塔面板安装
```

---

## 第二步：安装 Nginx（如果还没安装）

### 通过宝塔面板安装：

1. 登录宝塔面板
2. 进入 **软件商店**
3. 搜索 **Nginx**
4. 点击 **安装**
5. 等待安装完成

### 验证安装：

```bash
nginx -v
```

---

## 第三步：配置环境变量（重要！）

### 3.1 进入项目目录

```bash
cd /root/linklore
# 或根据你的实际路径
cd /www/wwwroot/linklore
```

### 3.2 检查环境变量文件是否存在

```bash
ls -la apps/web/.env.production
```

如果文件不存在，创建它：

```bash
# 创建环境变量文件
touch apps/web/.env.production

# 或者复制模板（如果存在）
# cp apps/web/.env.production.example apps/web/.env.production
```

### 3.3 编辑环境变量

```bash
nano apps/web/.env.production
```

### 3.4 添加或修改以下配置

```bash
# 应用 URL（必须配置！）
NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"

# 数据库连接（根据你的实际情况修改）
DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/linklore?sslmode=require"

# 会话密钥（至少32字符，使用以下命令生成）
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET="你的32位以上随机字符串"

# Redis 连接（根据你的实际情况修改）
REDIS_URL="redis://:密码@Redis地址:6379/0"

# 阿里云 OSS 配置
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY_ID="你的AccessKey ID"
OSS_ACCESS_KEY_SECRET="你的AccessKey Secret"
OSS_BUCKET="你的Bucket名称"
```

### 3.5 保存并退出

- 按 `Ctrl + O` 保存
- 按 `Enter` 确认
- 按 `Ctrl + X` 退出

---

## 第四步：运行部署脚本

### 4.1 给脚本执行权限

```bash
chmod +x infrastructure/scripts/deploy.sh
```

### 4.2 运行部署脚本

```bash
./infrastructure/scripts/deploy.sh
```

**这个脚本会**：
- 安装 pnpm
- 安装项目依赖
- 构建项目
- 运行数据库迁移
- 启动 PM2 服务

**预计时间**：5-15 分钟（取决于网络速度）

---

## 第五步：在宝塔面板配置网站

### 5.1 添加网站

1. 登录宝塔面板
2. 进入 **网站** → **添加站点**
3. 配置：
   - **域名**：`linkloredu.com` 和 `www.linkloredu.com`（两个都填）
   - **根目录**：`/root/linklore` 或 `/www/wwwroot/linklore`（根据你的实际路径）
   - **PHP 版本**：**纯静态**
4. 点击 **提交**

### 5.2 配置反向代理

1. 在网站列表中，点击域名右侧的 **设置**
2. 进入 **反向代理** 标签
3. 点击 **添加反向代理**
4. 配置：
   - **代理名称**：`linklore`
   - **目标 URL**：`http://127.0.0.1:3000`
   - **发送域名**：`$host`
5. 点击 **保存**

### 5.3 修改 Nginx 配置（确保 WebSocket 支持）

1. 在网站设置中，进入 **配置文件** 标签
2. 找到 `location /` 块，确保包含：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 75s;
    client_max_body_size 25m;
}
```

3. 点击 **保存**
4. 点击 **重载配置**

---

## 第六步：申请 SSL 证书

### 6.1 申请证书

1. 在网站设置中，进入 **SSL** 标签
2. 选择 **Let's Encrypt**
3. 勾选两个域名：
   - `linkloredu.com`
   - `www.linkloredu.com`
4. 点击 **申请**
5. 等待申请完成（通常 1-2 分钟）

### 6.2 开启强制 HTTPS

1. 申请成功后，勾选 **强制 HTTPS**
2. 点击 **保存**

---

## 第七步：启动服务

### 7.1 检查 PM2 状态

```bash
pm2 status
```

### 7.2 如果服务没有运行，启动服务

```bash
cd /root/linklore
# 或
cd /www/wwwroot/linklore

# 启动服务
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 设置开机自启
pm2 save
pm2 startup
```

### 7.3 应该看到两个进程

- `linklore-web` - 运行中
- `linklore-worker` - 运行中

---

## 第八步：验证部署

### 8.1 访问网站

在浏览器中访问：
- `https://www.linkloredu.com`
- `https://linkloredu.com`（应该自动跳转到 www）

### 8.2 健康检查

访问：`https://www.linkloredu.com/api/health`

应该返回 JSON 响应：
```json
{
  "ok": true,
  "db": "up",
  ...
}
```

### 8.3 测试功能

1. **匿名访问**：直接访问聊天页面，应该能创建访客账号
2. **注册功能**：测试用户注册
3. **登录功能**：测试用户登录
4. **聊天功能**：测试聊天是否正常

---

## 常见问题

### 问题 1：PM2 服务启动失败

**检查日志**：
```bash
pm2 logs
```

**常见原因**：
- 环境变量配置错误
- 数据库连接失败
- 端口被占用

### 问题 2：访问网站显示 502 Bad Gateway

**检查**：
1. PM2 服务是否运行：`pm2 status`
2. Next.js 应用是否在 3000 端口：`netstat -tlnp | grep 3000`
3. 反向代理配置是否正确

### 问题 3：Server Actions 不工作

**检查**：
1. 环境变量 `NEXT_PUBLIC_APP_URL` 是否正确
2. 是否重启了服务：`pm2 restart all`

---

## 完成检查清单

- [ ] Node.js 已安装
- [ ] PM2 已安装
- [ ] Nginx 已通过宝塔面板安装
- [ ] 环境变量已配置（特别是 `NEXT_PUBLIC_APP_URL`）
- [ ] 部署脚本已运行
- [ ] 宝塔面板已添加网站
- [ ] 反向代理已配置
- [ ] SSL 证书已申请
- [ ] PM2 服务正在运行
- [ ] 网站可以正常访问（HTTPS）
- [ ] 健康检查接口正常

---

## 下一步

完成所有步骤后，你的网站应该可以通过 `https://www.linkloredu.com` 访问了！

如果遇到任何问题，可以：
1. 查看 PM2 日志：`pm2 logs`
2. 查看 Nginx 错误日志：宝塔面板 → 网站 → 设置 → 日志
3. 检查环境变量是否正确











