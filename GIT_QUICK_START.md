# Git 快速设置（5分钟）

## 一、在本地初始化 Git 仓库

在项目根目录（`F:\SITE\linklore`）执行：

```powershell
# 1. 初始化 Git
git init

# 2. 添加所有文件
git add .

# 3. 创建第一次提交
git commit -m "Initial commit"
```

## 二、创建远程仓库

### 选择平台（任选一个）

**GitHub**：https://github.com
- 注册 → 创建仓库 → 获取 URL

**Gitee（推荐国内）**：https://gitee.com
- 注册 → 创建仓库 → 获取 URL

**阿里云 Code**：https://code.aliyun.com
- 注册 → 创建仓库 → 获取 URL

### 创建仓库步骤

1. 登录平台
2. 点击"新建仓库"或"New repository"
3. 仓库名：`linklore`
4. **不要**勾选"初始化 README"
5. 点击创建
6. **复制仓库 URL**（如：`https://github.com/your-username/linklore.git`）

## 三、连接并推送

```powershell
# 1. 添加远程仓库（替换为你的 URL）
git remote add origin https://github.com/your-username/linklore.git

# 2. 推送代码
git push -u origin main
```

**如果提示需要认证**：
- GitHub：使用 Personal Access Token（不是密码）
- Gitee：使用账号密码

## 四、在服务器上 Clone

在宝塔终端中：

```bash
cd /www/wwwroot
git clone https://github.com/your-username/linklore.git linklore
```

**替换 `https://github.com/your-username/linklore.git` 为你的实际仓库 URL**

---

## 获取 Personal Access Token（GitHub）

1. GitHub → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token
4. 权限：勾选 `repo`
5. 生成后复制 Token（只显示一次）
6. 推送时密码处输入 Token

---

## 如果不想用 Git

也可以直接在宝塔面板中：
1. 使用 **文件管理器** 上传项目压缩包
2. 解压到 `/www/wwwroot/linklore`
3. 继续部署流程

