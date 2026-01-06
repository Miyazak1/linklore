# 迁移成功后的下一步

## 当前状态

✅ **数据库迁移已成功完成**！
- `20251112133920_init` - 已应用
- `20251112143205_add_relations` - 已应用
- `20251112150151_add_api_endpoint` - 已应用

---

## 下一步：构建和部署

### 第一步：构建项目

```bash
cd /www/wwwroot/www.linkloredu.com

# 构建项目
pnpm build
```

**预计时间**：3-10 分钟（取决于项目大小和网络速度）

### 第二步：启动 PM2 服务

```bash
# 启动服务
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 设置开机自启
pm2 save
pm2 startup
```

应该看到两个进程：
- `linklore-web` - 运行中
- `linklore-worker` - 运行中

### 第三步：验证服务

```bash
# 查看日志
pm2 logs

# 或者查看特定服务的日志
pm2 logs linklore-web
```

---

## 如果构建失败

### 检查 TypeScript 错误

如果构建时还有 TypeScript 错误，可以：

1. **只构建 web 应用**（跳过 worker）：
   ```bash
   cd /www/wwwroot/www.linkloredu.com/apps/web
   pnpm build
   ```

2. **或者安装缺少的依赖**：
   ```bash
   cd /www/wwwroot/www.linkloredu.com
   pnpm add -D -w @types/sanitize-html @types/ali-oss
   pnpm add -w bullmq ioredis
   ```

---

## 快速操作（一键完成）

执行以下命令：

```bash
cd /www/wwwroot/www.linkloredu.com && \
echo "🔨 构建项目..." && \
pnpm build && \
echo "" && \
echo "✅ 构建完成！" && \
echo "" && \
echo "🚀 启动 PM2 服务..." && \
pm2 start ecosystem.config.js --env production && \
pm2 save && \
pm2 startup && \
echo "" && \
echo "✅ 服务已启动！" && \
echo "" && \
echo "📊 查看服务状态：" && \
pm2 status
```

---

## 验证部署

### 1. 检查 PM2 状态

```bash
pm2 status
```

应该看到两个进程在运行。

### 2. 访问网站

- 打开浏览器
- 访问：`https://www.linkloredu.com`
- 应该能看到网站首页

### 3. 健康检查

- 访问：`https://www.linkloredu.com/api/health`
- 应该返回 JSON 响应

---

## 完成检查清单

- [x] 数据库迁移已成功完成
- [ ] 项目构建已完成
- [ ] PM2 服务已启动（两个进程）
- [ ] 网站可以正常访问（HTTPS）
- [ ] 健康检查接口正常

---

## 如果构建或启动失败

### 查看日志

```bash
# 查看 PM2 日志
pm2 logs

# 查看构建错误
# 检查终端输出中的错误信息
```

### 常见问题

1. **TypeScript 错误**：可能需要安装缺少的类型声明
2. **端口被占用**：检查 3000 端口是否被占用
3. **环境变量**：确保 `.env.production` 配置正确

---

## 重要提示

1. **构建需要时间**：请耐心等待 3-10 分钟
2. **如果构建失败**：可以先启动服务，TypeScript 错误不会阻止运行
3. **检查日志**：如果服务启动失败，查看日志找出问题

---

## 下一步

现在执行构建和启动服务：

```bash
cd /www/wwwroot/www.linkloredu.com
pnpm build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 status
```

完成后告诉我结果！





















