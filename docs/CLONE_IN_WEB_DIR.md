# 在网站目录中克隆项目

## 当前情况

`/www/wwwroot/wwwroot/www.linkloredu.com` 目录是空的，需要克隆项目。

---

## 操作步骤

### 第一步：在终端中进入网站目录

```bash
# 进入网站目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 确认当前目录
pwd
# 应该显示：/www/wwwroot/wwwroot/www.linkloredu.com
```

### 第二步：克隆项目

```bash
# 克隆项目到当前目录（注意最后的点）
git clone https://github.com/Miyazak1/linklore.git .
```

**重要**：最后的 `.` 表示克隆到当前目录，而不是创建新的 `linklore` 子目录。

### 第三步：验证克隆结果

```bash
# 查看文件列表
ls -la

# 应该能看到：
# - apps/ 目录
# - worker/ 目录
# - prisma/ 目录
# - package.json 文件
# - 等等
```

---

## 完整命令序列

直接复制粘贴以下命令：

```bash
cd /www/wwwroot/wwwroot/www.linkloredu.com && \
git clone https://github.com/Miyazak1/linklore.git . && \
ls -la
```

---

## 克隆完成后

### 1. 配置环境变量

```bash
# 创建环境变量文件
echo 'NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"' > apps/web/.env.production

# 验证
cat apps/web/.env.production
```

### 2. 运行部署脚本

```bash
# 给脚本执行权限
chmod +x infrastructure/scripts/deploy.sh

# 运行部署脚本
./infrastructure/scripts/deploy.sh
```

### 3. 验证 PM2 服务

```bash
# 查看 PM2 状态
pm2 status
```

---

## 如果克隆失败

### 问题 1：Git 未安装

```bash
# 安装 Git
sudo dnf install -y git

# 验证
git --version
```

### 问题 2：网络连接问题

```bash
# 检查网络
ping github.com

# 如果无法访问 GitHub，可以尝试：
# 1. 使用代理
# 2. 或者手动上传项目文件
```

### 问题 3：权限问题

```bash
# 检查目录权限
ls -ld /www/wwwroot/wwwroot/www.linkloredu.com

# 如果需要，修改权限
chown -R www:www /www/wwwroot/wwwroot/www.linkloredu.com
```

---

## 验证克隆结果

克隆完成后，在文件管理器中刷新，应该能看到：

**文件夹**：
- `apps/`
- `worker/`
- `prisma/`
- `infrastructure/`
- `docs/`
- `.git/`（隐藏文件夹）

**文件**：
- `package.json`
- `README.md`
- `ecosystem.config.js`
- `pnpm-workspace.yaml`
- 等等

---

## 快速操作流程

```bash
# 1. 进入网站目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 2. 克隆项目
git clone https://github.com/Miyazak1/linklore.git .

# 3. 配置环境变量
echo 'NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"' > apps/web/.env.production

# 4. 运行部署脚本
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh

# 5. 检查 PM2 状态
pm2 status
```

---

## 重要提示

1. **使用 `.` 而不是目录名**：`git clone ... .` 会克隆到当前目录
2. **确保目录为空**：如果目录有文件，克隆可能会失败
3. **克隆需要时间**：根据网络速度，可能需要几分钟

---

## 完成后的检查清单

- [ ] 项目已克隆到网站目录
- [ ] 文件管理器中能看到项目文件
- [ ] 环境变量已配置
- [ ] 部署脚本已运行
- [ ] PM2 服务已启动











