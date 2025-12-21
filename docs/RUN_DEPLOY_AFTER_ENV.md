# 环境变量配置完成后的操作

## 当前状态

✅ 环境变量已配置：
- `NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"`
- `DATABASE_URL="postgresql://linklore_user:Nuan2230543@127.0.0.1:5432/linklore"`

---

## 下一步：重新运行部署脚本

现在环境变量已配置好，重新运行部署脚本：

```bash
# 进入项目目录（如果还没进入）
cd /www/wwwroot/www.linkloredu.com

# 运行部署脚本
./infrastructure/scripts/deploy.sh
```

这次应该能成功连接数据库并完成迁移。

---

## 部署脚本会做什么

1. **安装 pnpm**（如果还没安装）
2. **安装项目依赖**（`pnpm install`）
3. **构建项目**（`pnpm build`）
4. **生成 Prisma Client**（`pnpm prisma:generate`）
5. **运行数据库迁移**（`pnpm prisma:migrate`）- 这次应该能成功
6. **启动 PM2 服务**（`pm2 start ecosystem.config.js`）

**预计时间**：5-15 分钟

---

## 如果部署脚本成功

部署完成后，应该能看到：

1. **PM2 服务已启动**：
   ```bash
   pm2 status
   ```
   应该看到两个进程：
   - `linklore-web` - 运行中
   - `linklore-worker` - 运行中

2. **网站可以访问**：
   - 打开浏览器访问：`https://www.linkloredu.com`
   - 应该能看到网站首页

3. **健康检查**：
   - 访问：`https://www.linkloredu.com/api/health`
   - 应该返回 JSON 响应，包含数据库状态

---

## 如果部署脚本还有问题

### 问题 1：数据库连接仍然失败

**检查数据库服务**：
```bash
# 检查 PostgreSQL 服务状态
sudo systemctl status postgresql

# 如果服务未运行，启动它
sudo systemctl start postgresql
```

**测试数据库连接**：
```bash
psql -h 127.0.0.1 -U linklore_user -d linklore
```
输入密码：`Nuan2230543`

### 问题 2：其他错误

**查看详细日志**：
```bash
# 查看部署脚本的输出
# 或者查看 PM2 日志
pm2 logs
```

### 问题 3：环境变量未生效

**验证环境变量**：
```bash
cat apps/web/.env.production
```

确保两个变量都存在且正确。

---

## 部署完成后的验证

### 1. 检查 PM2 状态

```bash
pm2 status
```

应该看到两个进程在运行。

### 2. 查看日志

```bash
# 查看所有日志
pm2 logs

# 或者查看特定服务的日志
pm2 logs linklore-web
pm2 logs linklore-worker
```

### 3. 访问网站

- 打开浏览器
- 访问：`https://www.linkloredu.com`
- 应该能看到网站首页

### 4. 健康检查

- 访问：`https://www.linkloredu.com/api/health`
- 应该返回：
  ```json
  {
    "ok": true,
    "db": "up",
    ...
  }
  ```

---

## 如果 PM2 服务没有自动启动

手动启动：

```bash
cd /www/wwwroot/www.linkloredu.com
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 完成检查清单

- [x] 环境变量已配置（`NEXT_PUBLIC_APP_URL` 和 `DATABASE_URL`）
- [ ] 部署脚本已重新运行
- [ ] 数据库迁移已完成
- [ ] PM2 服务已启动（两个进程）
- [ ] 网站可以正常访问（HTTPS）
- [ ] 健康检查接口正常

---

## 快速操作

执行以下命令，重新运行部署脚本：

```bash
cd /www/wwwroot/www.linkloredu.com && \
./infrastructure/scripts/deploy.sh
```

---

## 重要提示

1. **环境变量已配置**：现在应该能连接数据库了
2. **部署需要时间**：请耐心等待 5-15 分钟
3. **如果还有错误**：查看错误信息，告诉我具体问题

---

## 下一步

现在执行部署脚本：

```bash
cd /www/wwwroot/www.linkloredu.com
./infrastructure/scripts/deploy.sh
```

完成后告诉我结果，我继续指导。











