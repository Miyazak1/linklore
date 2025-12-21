# 查找项目位置并移动到正确目录

## 当前情况

`/www/wwwroot/wwwroot/www.linkloredu.com` 文件夹是空的，说明项目还没有在这个位置。

项目可能在以下位置之一：
- `/root/linklore`
- `/www/wwwroot/linklore`
- 其他位置

---

## 第一步：查找项目位置

### 方法 1：在终端中查找

在宝塔面板终端或 SSH 中执行：

```bash
# 查找 linklore 目录
find / -name "linklore" -type d 2>/dev/null

# 或者查找 package.json 文件（项目根目录的标志）
find / -name "package.json" -type f 2>/dev/null | grep linklore

# 或者查找 apps 目录
find / -name "apps" -type d 2>/dev/null | grep linklore
```

### 方法 2：在宝塔面板中查找

1. 在文件管理器中，点击路径栏
2. 输入：`/root`
3. 查看是否有 `linklore` 文件夹

或者：

1. 点击路径栏
2. 输入：`/www/wwwroot`
3. 查看是否有 `linklore` 文件夹

---

## 第二步：根据找到的位置决定操作

### 情况 1：项目在 `/root/linklore`

**选项 A：移动项目到网站目录（推荐）**

```bash
# 移动项目
mv /root/linklore/* /www/wwwroot/wwwroot/www.linkloredu.com/
mv /root/linklore/.* /www/wwwroot/wwwroot/www.linkloredu.com/ 2>/dev/null

# 或者直接移动整个目录
mv /root/linklore /www/wwwroot/wwwroot/www.linkloredu.com
```

**选项 B：保持项目在 `/root/linklore`，修改网站根目录**

在宝塔面板中：
1. 进入 **网站** → 找到 `www.linkloredu.com`
2. 点击 **设置** → **网站目录**
3. 修改为：`/root/linklore`
4. 点击 **保存**

### 情况 2：项目在 `/www/wwwroot/linklore`

**移动项目到网站目录：**

```bash
# 移动项目
mv /www/wwwroot/linklore/* /www/wwwroot/wwwroot/www.linkloredu.com/
mv /www/wwwroot/linklore/.* /www/wwwroot/wwwroot/www.linkloredu.com/ 2>/dev/null
```

### 情况 3：项目不存在，需要克隆

```bash
# 进入网站目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 克隆项目
git clone https://github.com/Miyazak1/linklore.git .

# 注意：最后的 `.` 表示克隆到当前目录
```

---

## 第三步：验证项目文件

移动或克隆后，在文件管理器中刷新，应该能看到：
- `apps/` 文件夹
- `worker/` 文件夹
- `prisma/` 文件夹
- `package.json` 文件
- 等等

---

## 推荐操作流程

### 如果项目在 `/root/linklore`：

```bash
# 1. 进入网站目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 2. 复制项目文件（保留原项目作为备份）
cp -r /root/linklore/* .
cp -r /root/linklore/.* . 2>/dev/null

# 3. 验证
ls -la
```

### 如果项目不存在：

```bash
# 1. 进入网站目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 2. 克隆项目
git clone https://github.com/Miyazak1/linklore.git .

# 3. 验证
ls -la
```

---

## 第四步：配置环境变量

项目文件到位后：

1. 在文件管理器中，进入 `apps/web/` 目录
2. 创建或编辑 `.env.production` 文件
3. 添加配置：
   ```bash
   NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"
   ```

---

## 快速检查命令

在终端执行以下命令，快速找到项目：

```bash
# 检查常见位置
ls -la /root/linklore 2>/dev/null && echo "项目在 /root/linklore"
ls -la /www/wwwroot/linklore 2>/dev/null && echo "项目在 /www/wwwroot/linklore"
ls -la /home/*/linklore 2>/dev/null && echo "项目在 /home 目录"

# 如果都没找到，搜索整个系统
find / -name "package.json" -path "*/linklore/*" 2>/dev/null
```











