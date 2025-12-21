# 如何运行初始化脚本

## 前提条件

1. **已经连接到服务器**（通过 SSH）
2. **已经克隆了项目**到服务器
3. **当前在项目根目录**

---

## 完整步骤

### 步骤 1：确认你在项目根目录

```bash
# 查看当前目录
pwd

# 应该显示类似：/root/linklore 或 /home/用户名/linklore

# 查看目录内容，确认有 infrastructure 文件夹
ls -la
```

### 步骤 2：给脚本添加执行权限

```bash
chmod +x infrastructure/scripts/bootstrap-alinux.sh
```

**说明**：
- `chmod +x` 是给文件添加"可执行"权限
- 必须执行这一步，否则脚本无法运行

### 步骤 3：运行脚本

```bash
sudo ./infrastructure/scripts/bootstrap-alinux.sh
```

**说明**：
- `sudo` 表示以管理员权限运行（需要 root 权限安装软件）
- `./` 表示当前目录下的文件
- `infrastructure/scripts/bootstrap-alinux.sh` 是脚本的路径

---

## 如果遇到问题

### 问题 1：提示 "Permission denied"

**原因**：脚本没有执行权限

**解决**：
```bash
chmod +x infrastructure/scripts/bootstrap-alinux.sh
```

### 问题 2：提示 "No such file or directory"

**原因**：不在项目根目录，或者路径不对

**解决**：
```bash
# 确认你在项目根目录
pwd
ls infrastructure/scripts/

# 如果不在项目目录，先进入
cd ~/linklore
# 或者
cd /root/linklore
```

### 问题 3：提示 "command not found: dnf"

**原因**：系统不是 Alibaba Cloud Linux 3 或 CentOS

**解决**：
- 如果是 Ubuntu/Debian，脚本需要修改
- 或者手动安装所需软件（见下方）

### 问题 4：需要输入密码

**原因**：`sudo` 需要管理员密码

**解决**：
- 如果已经是 root 用户，可以不用 `sudo`：
  ```bash
  ./infrastructure/scripts/bootstrap-alinux.sh
  ```
- 如果不是 root，输入你的用户密码

---

## 脚本执行过程

脚本会依次执行以下操作：

1. **[1/8] 更新系统** - `sudo dnf -y update`
2. **[2/8] 安装 Git** - `sudo dnf -y install git`
3. **[3/8] 安装 Node.js 20 LTS** - 从 NodeSource 安装
4. **[4/8] 安装 Nginx** - Web 服务器
5. **[5/8] 安装 LibreOffice** - 文档处理工具
6. **[6/8] 安装 Redis**（可选）- 如果设置了 `INSTALL_REDIS=true`
7. **[7/8] 安装 PM2** - 进程管理器
8. **[8/8] 创建 Swap** - 2GB 交换空间

**预计时间**：5-15 分钟（取决于网络速度）

---

## 执行示例

```bash
# 1. 进入项目目录
cd ~/linklore

# 2. 查看脚本是否存在
ls -la infrastructure/scripts/bootstrap-alinux.sh

# 3. 给脚本执行权限
chmod +x infrastructure/scripts/bootstrap-alinux.sh

# 4. 运行脚本
sudo ./infrastructure/scripts/bootstrap-alinux.sh
```

**输出示例**：
```
[1/8] Updating system...
...
[2/8] Installing Git...
...
[3/8] Installing Node.js 20 LTS...
...
[4/8] Installing nginx...
...
[5/8] Installing LibreOffice (headless)...
...
[6/8] (Optional) Installing Redis (for development)...
...
[7/8] Installing PM2 (process manager)...
...
[8/8] Creating swap (2G) if absent...
...
==========================================
Bootstrap completed!
==========================================
```

---

## 执行完成后

脚本执行完成后，会显示下一步操作提示：

1. 配置环境变量
2. 运行部署脚本
3. 配置 Nginx
4. 获取 SSL 证书
5. 启动服务

---

## 如果脚本执行失败

### 方法 1：查看错误信息

脚本会显示具体的错误信息，根据错误信息解决问题。

### 方法 2：手动安装

如果脚本有问题，可以手动安装：

```bash
# 安装 Git
sudo dnf install -y git

# 安装 Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo -E bash -
sudo dnf -y install nodejs

# 安装 Nginx
sudo dnf -y install nginx

# 安装 PM2
sudo npm install -g pm2
```

---

## 注意事项

1. **需要 root 权限**：脚本需要安装系统软件，必须使用 `sudo` 或 root 用户
2. **网络连接**：需要稳定的网络连接下载软件包
3. **时间较长**：首次运行可能需要 5-15 分钟
4. **不要中断**：执行过程中不要按 Ctrl+C 中断

---

## 验证安装

脚本执行完成后，验证安装：

```bash
# 检查 Git
git --version

# 检查 Node.js
node --version

# 检查 npm
npm --version

# 检查 Nginx
nginx -v

# 检查 PM2
pm2 --version
```

如果所有命令都能正常显示版本号，说明安装成功！











