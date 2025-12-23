# 服务器快速部署指南

## 第一步：安装 Git（如果未安装）

在服务器上执行：

```bash
# Alibaba Cloud Linux 3 / CentOS
sudo dnf install -y git

# 验证安装
git --version
```

## 第二步：克隆项目

```bash
cd ~
git clone https://github.com/Miyazak1/linklore.git
cd linklore
```

## 第三步：运行初始化脚本（安装 Node.js、Nginx 等）

```bash
# 给脚本执行权限
chmod +x infrastructure/scripts/bootstrap-alinux.sh

# 运行初始化脚本
sudo ./infrastructure/scripts/bootstrap-alinux.sh
```

**这个脚本会安装**：
- Git（如果还没安装）
- Node.js 20 LTS
- Nginx
- LibreOffice（用于文档处理）
- PM2（进程管理器）
- 可选：Redis（如果设置了 `INSTALL_REDIS=true`）

## 第四步：配置环境变量

```bash
# 复制环境变量模板（如果存在）
# cp apps/web/.env.production.example apps/web/.env.production

# 创建环境变量文件
nano apps/web/.env.production
```

**必须配置的变量**：
- `DATABASE_URL` - PostgreSQL 数据库连接
- `SESSION_SECRET` - 会话密钥（至少32字符）
- `REDIS_URL` - Redis 连接
- `OSS_*` - 阿里云 OSS 配置
- `NEXT_PUBLIC_APP_URL` - 你的域名

## 第五步：运行部署脚本

```bash
# 给脚本执行权限
chmod +x infrastructure/scripts/deploy.sh

# 运行部署脚本
./infrastructure/scripts/deploy.sh
```

**这个脚本会**：
- 安装 pnpm
- 安装项目依赖
- 构建项目
- 运行数据库迁移
- 启动 PM2 进程

## 第六步：配置 Nginx

```bash
# 复制 Nginx 配置
sudo cp infrastructure/nginx/nginx.conf /etc/nginx/nginx.conf

# 编辑配置，修改域名
sudo nano /etc/nginx/nginx.conf
# 将 your-domain.com 替换为你的实际域名

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

## 第七步：配置 SSL 证书（HTTPS）

```bash
# 安装 Certbot
sudo dnf install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 完成！

访问你的域名，应该能看到 LinkLore 应用了。

## 常用命令

```bash
# 查看 PM2 进程状态
pm2 list

# 查看日志
pm2 logs

# 重启应用
pm2 restart all

# 停止应用
pm2 stop all

# 查看 Nginx 状态
sudo systemctl status nginx

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/error.log
```















