# 网站配置完成后的操作

## 当前进度

✅ 网站已添加  
✅ 反向代理已配置  
✅ SSL 证书已申请  

---

## 下一步操作

### 第一步：确认环境变量已配置

#### 方法 1：在宝塔面板中检查

1. 进入 **文件** 菜单
2. 导航到：`/www/wwwroot/wwwroot/www.linkloredu.com/apps/web/`
3. 查找 `.env.production` 文件
4. 点击文件名，检查是否包含：

```bash
NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"
```

#### 方法 2：在终端中检查

```bash
# 进入项目目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 检查环境变量文件
cat apps/web/.env.production
```

#### 如果文件不存在或内容不对

```bash
# 创建或更新环境变量文件
echo 'NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"' > apps/web/.env.production

# 验证
cat apps/web/.env.production
```

---

### 第二步：运行部署脚本

```bash
# 进入项目目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 给脚本执行权限
chmod +x infrastructure/scripts/deploy.sh

# 运行部署脚本
./infrastructure/scripts/deploy.sh
```

**这个脚本会**：
- 安装 pnpm（包管理器）
- 安装项目依赖（`pnpm install`）
- 构建项目（`pnpm build`）
- 生成 Prisma Client
- 运行数据库迁移
- 启动 PM2 服务

**预计时间**：5-15 分钟（取决于网络速度）

---

### 第三步：验证 PM2 服务状态

部署脚本完成后，检查服务状态：

```bash
# 查看 PM2 状态
pm2 status

# 应该看到两个进程：
# - linklore-web (运行中)
# - linklore-worker (运行中)
```

#### 如果服务没有运行

```bash
# 手动启动服务
cd /www/wwwroot/wwwroot/www.linkloredu.com
pm2 start ecosystem.config.js --env production

# 设置开机自启
pm2 save
pm2 startup
```

---

### 第四步：查看日志（如果有问题）

```bash
# 查看所有日志
pm2 logs

# 或者查看特定服务的日志
pm2 logs linklore-web
pm2 logs linklore-worker
```

---

### 第五步：验证网站访问

1. **访问网站**：
   - 打开浏览器
   - 访问：`https://www.linkloredu.com`
   - 应该能看到网站首页

2. **健康检查**：
   - 访问：`https://www.linkloredu.com/api/health`
   - 应该返回 JSON 响应：
     ```json
     {
       "ok": true,
       "db": "up",
       ...
     }
     ```

---

## 如果遇到问题

### 问题 1：部署脚本执行失败

**检查**：
```bash
# 检查环境变量
cat apps/web/.env.production

# 检查网络连接
ping github.com

# 检查磁盘空间
df -h
```

**常见原因**：
- 环境变量未配置
- 网络连接问题
- 磁盘空间不足
- 数据库连接失败（如果已配置数据库）

### 问题 2：PM2 服务无法启动

**检查日志**：
```bash
pm2 logs
```

**常见原因**：
- 环境变量配置错误
- 数据库连接失败
- 端口被占用
- 依赖未安装

### 问题 3：访问网站显示 502 Bad Gateway

**检查**：
1. PM2 服务是否运行：`pm2 status`
2. Next.js 应用是否在 3000 端口：`netstat -tlnp | grep 3000`
3. 反向代理配置是否正确

**解决**：
```bash
# 重启 PM2 服务
pm2 restart all

# 或者重启 Nginx
systemctl restart nginx
```

---

## 完成检查清单

- [ ] 环境变量已配置（`NEXT_PUBLIC_APP_URL`）
- [ ] 部署脚本已运行
- [ ] PM2 服务正在运行（两个进程）
- [ ] 网站可以正常访问（HTTPS）
- [ ] 健康检查接口正常（`/api/health`）

---

## 快速执行命令

如果想快速完成所有步骤，可以执行：

```bash
# 1. 进入项目目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 2. 确保环境变量已配置
echo 'NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"' > apps/web/.env.production

# 3. 给脚本执行权限并运行
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh

# 4. 检查 PM2 状态
pm2 status
```

---

## 下一步

完成部署后，你的网站应该可以通过 `https://www.linkloredu.com` 访问了！

如果遇到任何问题，告诉我具体的错误信息，我会帮你解决。















