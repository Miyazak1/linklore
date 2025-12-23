# 宝塔面板 Nginx 安装问题解决

## 问题说明

在运行初始化脚本时，Nginx 安装失败：
```
Error: Unable to find a match: nginx
```

## 原因

**宝塔面板已经自带 Nginx**，不需要通过 `dnf` 手动安装。

宝塔面板有自己的软件管理功能，Nginx 应该通过宝塔面板安装和管理。

---

## 解决方案

### 方案 1：使用宝塔面板安装 Nginx（推荐）

1. 登录宝塔面板
2. 进入 **软件商店**
3. 搜索 **Nginx**
4. 找到 **Nginx**（通常是第一个结果）
5. 点击 **安装**
6. 等待安装完成（通常 1-2 分钟）

### 方案 2：跳过 Nginx 安装，继续其他步骤

如果 Nginx 已经通过宝塔面板安装，可以忽略这个错误，继续后续配置。

---

## 验证 Nginx 是否已安装

在终端中执行：

```bash
# 检查 Nginx 是否已安装
nginx -v

# 或者
which nginx

# 检查 Nginx 服务状态
systemctl status nginx
```

如果显示版本号，说明 Nginx 已安装。

---

## 继续部署步骤

即使 Nginx 安装失败，其他步骤可以继续：

1. ✅ Node.js 已安装成功
2. ⚠️ Nginx 需要通过宝塔面板安装
3. 继续安装其他依赖（LibreOffice、PM2 等）

---

## 修改后的初始化流程

如果脚本因为 Nginx 安装失败而中断，可以：

### 选项 1：手动安装剩余依赖

```bash
# 安装 LibreOffice
sudo dnf install -y libreoffice-headless

# 安装 PM2（如果还没安装）
sudo npm install -g pm2

# 创建 Swap（如果需要）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
```

### 选项 2：通过宝塔面板安装

1. **Nginx**：软件商店 → 搜索 Nginx → 安装
2. **PM2**：软件商店 → 搜索 PM2 → 安装（或通过 npm 安装）

---

## 重要提示

**宝塔面板的 Nginx 管理方式**：

1. Nginx 通过宝塔面板安装和管理
2. 配置文件位置：`/www/server/nginx/conf/nginx.conf`
3. 网站配置：通过宝塔面板的 **网站** 功能管理
4. 不需要手动编辑 Nginx 配置文件（除非需要高级配置）

---

## 下一步

1. 通过宝塔面板安装 Nginx（如果还没安装）
2. 继续配置环境变量
3. 配置网站和反向代理
4. 申请 SSL 证书

参考 `docs/SERVER_CONFIG_STEPS.md` 继续配置。















