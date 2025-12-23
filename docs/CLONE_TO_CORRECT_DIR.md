# 在正确的目录中克隆项目

## 当前情况

✅ **网站目录**：`/www/wwwroot/www.linkloredu.com`（正确）  
✅ **运行目录**：`/`（保持默认即可，不需要修改）

---

## 关于运行目录

**运行目录**保持为 `/` 即可，这是默认设置，不需要修改。

运行目录的作用是：
- 指定网站的实际运行目录
- 对于我们的项目，保持 `/` 表示使用整个网站目录作为运行目录
- 这是正确的配置

---

## 现在需要做的

在网站目录 `/www/wwwroot/www.linkloredu.com` 中克隆项目。

---

## 操作步骤

### 第一步：进入网站目录

在终端执行：

```bash
cd /www/wwwroot/www.linkloredu.com

# 验证当前目录
pwd
# 应该显示：/www/wwwroot/www.linkloredu.com
```

### 第二步：检查目录是否为空

```bash
ls -la
```

如果目录是空的（只有 `.` 和 `..`），可以继续。

### 第三步：克隆项目

```bash
# 克隆项目到当前目录（注意最后的点）
git clone https://github.com/Miyazak1/linklore.git .
```

**重要**：最后的 `.` 表示克隆到当前目录，而不是创建新的 `linklore` 子目录。

### 第四步：验证克隆结果

```bash
ls -la
```

应该能看到项目文件：
- `apps/` 目录
- `worker/` 目录
- `prisma/` 目录
- `package.json` 文件
- 等等

---

## 一键执行（推荐）

直接复制粘贴这个命令：

```bash
cd /www/wwwroot/www.linkloredu.com && \
git clone https://github.com/Miyazak1/linklore.git . && \
ls -la | head -20
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

### 3. 检查 PM2 状态

```bash
pm2 status
```

---

## 如果克隆失败

### Git 未安装

```bash
sudo dnf install -y git
```

### 网络问题

```bash
# 检查网络
ping github.com
```

### 权限问题

```bash
# 检查目录权限
ls -ld /www/wwwroot/www.linkloredu.com

# 如果需要，修改权限
chown -R www:www /www/wwwroot/www.linkloredu.com
```

---

## 验证

克隆完成后：

1. **在文件管理器中**：刷新，应该能看到项目文件
2. **在终端中**：`ls -la` 应该显示项目文件

---

## 完成检查清单

- [x] 网站目录已确认：`/www/wwwroot/www.linkloredu.com`
- [x] 运行目录保持默认：`/`（不需要修改）
- [ ] 项目已克隆到网站目录
- [ ] 环境变量已配置
- [ ] 部署脚本已运行
- [ ] PM2 服务已启动

---

## 重要提示

1. **运行目录不需要修改**：保持 `/` 即可
2. **网站目录是正确的**：`/www/wwwroot/www.linkloredu.com`
3. **使用 `.` 克隆**：`git clone ... .` 会克隆到当前目录

---

## 下一步

现在执行克隆命令：

```bash
cd /www/wwwroot/www.linkloredu.com
git clone https://github.com/Miyazak1/linklore.git .
```

完成后告诉我，我继续指导后续步骤。















