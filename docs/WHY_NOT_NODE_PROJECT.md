# 为什么不应该添加 Node 项目

## 原因说明

### 1. 项目已经使用 PM2 管理

我们的项目已经配置了：
- `ecosystem.config.js` - PM2 配置文件
- PM2 会直接管理 Next.js 应用进程

### 2. 宝塔面板的 Node 项目管理 vs PM2

**宝塔面板的 Node 项目管理**：
- 适合简单的 Node.js 应用
- 宝塔面板会管理进程的启动和停止
- 可能与 PM2 冲突

**PM2 管理**（我们使用的方式）：
- 更适合生产环境
- 支持集群模式、自动重启、日志管理
- 已经在 `ecosystem.config.js` 中配置好了

### 3. 正确的部署方式

我们的部署架构是：
```
用户请求 → Nginx (80/443) → 反向代理 → Next.js (3000端口) → PM2管理
```

所以应该：
1. **添加网站**（HTML 项目或 PHP 项目选择纯静态）
2. **配置反向代理**到 `http://127.0.0.1:3000`
3. **PM2 管理** Next.js 应用（通过 `ecosystem.config.js`）

---

## 正确的操作步骤

### 第一步：添加网站（不是 Node 项目）

1. 在宝塔面板的 **网站** 页面
2. 点击 **添加站点**（或 **添加HTML项目**）
3. 填写：
   - **域名**：`linkloredu.com` 和 `www.linkloredu.com`
   - **根目录**：`/www/wwwroot/wwwroot/www.linkloredu.com`
   - **PHP 版本**：**纯静态**（不需要 PHP）
4. 点击 **提交**

### 第二步：配置反向代理

1. 网站设置 → **反向代理** → 添加反向代理
2. **目标 URL**：`http://127.0.0.1:3000`
3. **发送域名**：`$host`
4. 保存

### 第三步：PM2 管理应用

```bash
# 进入项目目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 启动 PM2 服务
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 总结

✅ **应该做**：
- 添加网站（HTML 项目或 PHP 项目选择纯静态）
- 配置反向代理
- 使用 PM2 管理 Next.js 应用

❌ **不应该做**：
- 添加 Node 项目（会与 PM2 冲突）
- 让宝塔面板管理 Node.js 进程

---

## 为什么选择 HTML 项目或 PHP 项目（纯静态）

因为：
1. Next.js 应用由 PM2 管理，不需要宝塔面板管理进程
2. 我们只需要 Nginx 作为反向代理
3. 选择"纯静态"表示不需要 PHP 处理，只需要 Nginx 转发请求

---

## 完整的部署流程

1. ✅ 项目文件已复制到 `/www/wwwroot/wwwroot/www.linkloredu.com`
2. ⏳ 添加网站（HTML 项目或 PHP 项目选择纯静态）
3. ⏳ 配置反向代理
4. ⏳ 申请 SSL 证书
5. ⏳ 运行部署脚本（安装依赖、构建项目）
6. ⏳ 启动 PM2 服务















