# 修复 502 Bad Gateway 错误

## 问题诊断

502 Bad Gateway 错误表示 nginx 无法连接到后端应用服务器（Next.js）。常见原因：

1. **PM2 服务没有运行**
2. **应用启动失败**
3. **端口配置不匹配**
4. **环境变量缺失**

---

## 快速诊断步骤

### 第一步：检查 PM2 服务状态

在宝塔终端执行：

```bash
# 进入项目目录
cd /www/wwwroot/linklore

# 查看 PM2 状态
pm2 status
```

**预期结果**：应该看到 `linklore-web` 状态为 `online`

**如果服务没有运行**：
```bash
# 启动所有服务
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 保存配置（开机自启）
pm2 save
```

---

### 第二步：检查应用日志

```bash
# 查看 web 应用日志
pm2 logs linklore-web --lines 50

# 或查看错误日志文件
tail -50 logs/web-error.log
```

**常见错误**：
- 数据库连接失败
- 环境变量缺失
- 端口被占用
- 依赖缺失

---

### 第三步：检查端口是否被占用

```bash
# 检查 3000 端口是否在监听
netstat -tlnp | grep 3000
# 或
ss -tlnp | grep 3000
```

**如果端口没有监听**：说明应用没有启动成功，查看日志找出原因。

**如果端口被其他进程占用**：
```bash
# 查找占用端口的进程
lsof -i :3000
# 或
fuser 3000/tcp

# 如果需要，可以修改 ecosystem.config.js 中的 PORT
```

---

### 第四步：检查 nginx 反向代理配置

在宝塔面板中：

1. 进入 **网站** → 找到你的网站 → **设置**
2. 点击 **反向代理** 标签
3. 检查 **目标 URL** 是否为：`http://127.0.0.1:3000`

**如果配置错误**：
- 点击 **修改** 或 **添加反向代理**
- **目标 URL**：`http://127.0.0.1:3000`
- **发送域名**：`$host`
- 保存并重启 nginx

---

### 第五步：检查环境变量

```bash
# 检查环境变量文件是否存在
ls -la apps/web/.env.production

# 查看环境变量内容（注意隐藏敏感信息）
cat apps/web/.env.production | grep -v PASSWORD | grep -v SECRET
```

**必需的环境变量**：
- `DATABASE_URL` - 数据库连接字符串
- `NEXT_PUBLIC_APP_URL` - 应用 URL
- `NODE_ENV=production` - 环境模式

---

## 完整修复流程

### 方案 1：重新启动服务（推荐）

```bash
cd /www/wwwroot/linklore

# 停止所有服务
pm2 stop all

# 删除所有进程
pm2 delete all

# 重新启动
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs linklore-web --lines 20
```

---

### 方案 2：手动启动测试

```bash
cd /www/wwwroot/linklore

# 手动启动应用（测试）
cd apps/web
pnpm start

# 在另一个终端测试
curl http://127.0.0.1:3000/api/health
```

如果手动启动成功，说明问题在 PM2 配置。

---

### 方案 3：检查并修复常见问题

#### 问题 1：数据库连接失败

```bash
# 测试数据库连接
psql -h 127.0.0.1 -U linklore_user -d linklore

# 如果连接失败，检查：
# 1. PostgreSQL 服务是否运行
systemctl status postgresql

# 2. 数据库用户和密码是否正确
# 3. DATABASE_URL 环境变量是否正确
```

#### 问题 2：Prisma Client 未生成

```bash
cd /www/wwwroot/linklore
pnpm prisma:generate
```

#### 问题 3：构建文件缺失

```bash
cd /www/wwwroot/linklore
pnpm build
```

---

## 验证修复

### 1. 检查 PM2 状态

```bash
pm2 status
```

应该看到：
```
┌─────┬──────────────────┬─────────┬─────────┬─────────┐
│ id  │ name             │ status  │ restart │ uptime  │
├─────┼──────────────────┼─────────┼─────────┼─────────┤
│ 0   │ linklore-web     │ online  │ 0        │ 1m      │
│ 1   │ linklore-worker  │ online  │ 0        │ 1m      │
└─────┴──────────────────┴─────────┴─────────┴─────────┴
```

### 2. 测试本地连接

```bash
# 测试应用是否响应
curl http://127.0.0.1:3000/api/health

# 应该返回 JSON 响应
```

### 3. 检查 nginx 错误日志

在宝塔面板中：
- **网站** → **设置** → **日志**
- 查看 **错误日志**

### 4. 访问网站

打开浏览器访问你的网站，应该不再显示 502 错误。

---

## 如果问题仍然存在

### 收集诊断信息

```bash
# 1. PM2 状态
pm2 status > /tmp/pm2-status.txt

# 2. 应用日志
pm2 logs linklore-web --lines 100 > /tmp/pm2-logs.txt

# 3. 端口监听
netstat -tlnp > /tmp/ports.txt

# 4. 环境变量（隐藏敏感信息）
cat apps/web/.env.production | grep -v PASSWORD | grep -v SECRET > /tmp/env.txt

# 5. nginx 配置
cat /www/server/panel/vhost/nginx/你的网站.conf > /tmp/nginx-config.txt
```

然后检查这些文件找出问题。

---

## 常见错误和解决方案

### 错误：`EADDRINUSE: address already in use :::3000`

**解决方案**：
```bash
# 查找占用端口的进程
lsof -i :3000
# 或
fuser 3000/tcp

# 杀死进程
kill -9 <PID>

# 或修改端口（在 ecosystem.config.js 中）
PORT: 3001
```

### 错误：`Cannot find module '@prisma/client'`

**解决方案**：
```bash
cd /www/wwwroot/linklore
pnpm prisma:generate
```

### 错误：数据库连接失败

**解决方案**：
1. 检查 PostgreSQL 服务：`systemctl status postgresql`
2. 检查 `DATABASE_URL` 环境变量
3. 测试连接：`psql -h 127.0.0.1 -U linklore_user -d linklore`

---

## 预防措施

1. **设置开机自启**：
   ```bash
   pm2 startup
   pm2 save
   ```

2. **监控服务**：
   ```bash
   pm2 monit
   ```

3. **定期检查日志**：
   ```bash
   pm2 logs --lines 50
   ```

