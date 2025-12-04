# Git 仓库设置指南

本指南将帮助你设置 Git 仓库，以便在服务器上使用 `git clone` 部署项目。

---

## 一、初始化本地 Git 仓库

### 步骤 1：初始化仓库

在项目根目录（`F:\SITE\linklore`）执行：

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 创建第一次提交
git commit -m "Initial commit: LinkLore project"
```

### 步骤 2：检查状态

```bash
# 查看状态
git status

# 查看提交历史
git log
```

---

## 二、创建远程仓库

你需要在一个 Git 托管平台创建远程仓库。推荐平台：

### 选项 1：GitHub（国际，推荐）

1. **注册账号**：访问 https://github.com
2. **创建仓库**：
   - 点击右上角 `+` → `New repository`
   - 仓库名称：`linklore`（或自定义）
   - 选择 **Private**（私有）或 **Public**（公开）
   - **不要**勾选 "Initialize with README"（因为本地已有代码）
   - 点击 `Create repository`

3. **获取仓库 URL**：
   - 创建后会显示仓库 URL，格式：
     - HTTPS：`https://github.com/your-username/linklore.git`
     - SSH：`git@github.com:your-username/linklore.git`

### 选项 2：Gitee（国内，速度快）

1. **注册账号**：访问 https://gitee.com
2. **创建仓库**：
   - 点击右上角 `+` → `新建仓库`
   - 仓库名称：`linklore`
   - 选择 **私有** 或 **公开**
   - **不要**勾选 "使用Readme文件初始化"
   - 点击 `创建`

3. **获取仓库 URL**：
   - HTTPS：`https://gitee.com/your-username/linklore.git`
   - SSH：`git@gitee.com:your-username/linklore.git`

### 选项 3：阿里云 Code（国内，与阿里云集成）

1. **注册账号**：访问 https://code.aliyun.com
2. **创建仓库**：类似 GitHub/Gitee

---

## 三、连接本地仓库到远程仓库

### 步骤 1：添加远程仓库

在项目根目录执行（替换为你的实际 URL）：

**GitHub 示例**：
```bash
git remote add origin https://github.com/your-username/linklore.git
```

**Gitee 示例**：
```bash
git remote add origin https://gitee.com/your-username/linklore.git
```

### 步骤 2：验证远程仓库

```bash
# 查看远程仓库
git remote -v

# 应该显示：
# origin  https://github.com/your-username/linklore.git (fetch)
# origin  https://github.com/your-username/linklore.git (push)
```

### 步骤 3：推送代码

```bash
# 推送代码到远程仓库
git push -u origin main

# 如果提示分支名不是 main，可能是 master，使用：
git push -u origin master
```

**如果提示需要认证**：
- **GitHub**：使用 Personal Access Token（不是密码）
  - 生成 Token：Settings → Developer settings → Personal access tokens → Generate new token
  - 权限：至少勾选 `repo`
- **Gitee**：使用账号密码或 Access Token

---

## 四、在服务器上 Clone

### 方式 1：使用 HTTPS（推荐，简单）

在宝塔终端中：

```bash
cd /www/wwwroot
git clone https://github.com/your-username/linklore.git linklore
# 或
git clone https://gitee.com/your-username/linklore.git linklore
```

**如果需要认证**：
- 输入用户名和密码（或 Token）

### 方式 2：使用 SSH（推荐，无需每次输入密码）

**步骤 1：生成 SSH 密钥**（在本地或服务器）

```bash
# 生成 SSH 密钥
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# 按回车使用默认路径
# 可以设置密码（可选）
```

**步骤 2：添加公钥到 Git 平台**

```bash
# 查看公钥
cat ~/.ssh/id_rsa.pub
```

**GitHub**：
- Settings → SSH and GPG keys → New SSH key
- 粘贴公钥内容

**Gitee**：
- 设置 → SSH公钥 → 添加公钥
- 粘贴公钥内容

**步骤 3：在服务器上 Clone**

```bash
cd /www/wwwroot
git clone git@github.com:your-username/linklore.git linklore
# 或
git clone git@gitee.com:your-username/linklore.git linklore
```

---

## 五、完整操作示例

### 在本地（Windows）

```powershell
# 1. 进入项目目录
cd F:\SITE\linklore

# 2. 初始化 Git
git init

# 3. 添加所有文件
git add .

# 4. 创建提交
git commit -m "Initial commit: LinkLore project"

# 5. 添加远程仓库（替换为你的 URL）
git remote add origin https://github.com/your-username/linklore.git

# 6. 推送代码
git push -u origin main
```

### 在服务器（宝塔终端）

```bash
# 1. 进入网站目录
cd /www/wwwroot

# 2. Clone 项目
git clone https://github.com/your-username/linklore.git linklore

# 3. 进入项目目录
cd linklore

# 4. 继续部署流程
chmod +x infrastructure/scripts/deploy-bt.sh
./infrastructure/scripts/deploy-bt.sh
```

---

## 六、后续更新代码

### 在本地更新后推送到远程

```bash
# 1. 添加更改
git add .

# 2. 提交更改
git commit -m "描述你的更改"

# 3. 推送到远程
git push
```

### 在服务器上更新代码

```bash
cd /www/wwwroot/linklore
git pull
pnpm install --frozen-lockfile
pnpm build
pm2 restart ecosystem.config.js
```

---

## 七、常见问题

### 问题 1：`git push` 提示认证失败

**解决方案**：
- GitHub：使用 Personal Access Token 代替密码
- Gitee：检查账号密码或使用 Access Token

### 问题 2：分支名不是 `main`

```bash
# 查看当前分支
git branch

# 如果是 master，重命名为 main
git branch -M main

# 或直接推送到 master
git push -u origin master
```

### 问题 3：`.gitignore` 不生效

```bash
# 清除缓存后重新添加
git rm -r --cached .
git add .
git commit -m "Update .gitignore"
```

### 问题 4：文件太大无法推送

如果 `node_modules` 或 `pos/` 目录太大：

1. 确认 `.gitignore` 已正确配置
2. 如果已经提交了大文件，需要从 Git 历史中移除：

```bash
# 安装 git-lfs（如果需要）
git lfs install

# 或从历史中移除大文件（谨慎操作）
git filter-branch --tree-filter 'rm -rf pos/' HEAD
```

---

## 八、快速命令参考

```bash
# 初始化仓库
git init

# 添加文件
git add .

# 提交
git commit -m "提交信息"

# 添加远程仓库
git remote add origin <your-repo-url>

# 查看远程仓库
git remote -v

# 推送代码
git push -u origin main

# 拉取代码
git pull

# 查看状态
git status

# 查看提交历史
git log
```

---

## 九、推荐流程

### 第一次设置

1. **本地**：初始化 Git → 提交代码 → 推送到远程
2. **服务器**：Clone 远程仓库 → 部署

### 日常更新

1. **本地**：修改代码 → 提交 → 推送
2. **服务器**：`git pull` → 重新构建 → 重启服务

---

**完成 Git 设置后，就可以在服务器上使用 `git clone` 了！**

