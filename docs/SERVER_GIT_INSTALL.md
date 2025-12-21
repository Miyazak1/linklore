# 服务器 Git 安装指南

## 问题
在阿里云服务器上执行 `git clone` 时出现：
```
-bash: git: command not found
```

## 解决方案

### 方法 1：快速安装 Git（推荐）

在服务器上执行以下命令：

```bash
# 对于 Alibaba Cloud Linux 3 / CentOS 7+
sudo dnf install -y git

# 或者对于 Ubuntu/Debian
# sudo apt-get update && sudo apt-get install -y git
```

### 方法 2：验证安装

```bash
# 检查 Git 版本
git --version

# 应该显示类似：git version 2.x.x
```

### 方法 3：配置 Git（可选）

```bash
# 配置用户名和邮箱（用于提交记录）
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 安装完成后

继续执行克隆命令：

```bash
git clone https://github.com/Miyazak1/linklore.git
cd linklore
```

## 如果使用宝塔面板

如果你使用宝塔面板，也可以通过面板安装：

1. 登录宝塔面板
2. 进入 "软件商店"
3. 搜索 "Git"
4. 点击安装

或者通过 SSH 终端执行上面的命令。











