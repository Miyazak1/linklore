# 如何找到项目目录

## 当前情况

你当前在：`/www/wwwroot/www`

项目可能在以下位置之一：
- `/root/linklore`
- `/www/wwwroot/linklore`
- `/home/用户名/linklore`

---

## 在宝塔面板中导航

### 方法 1：使用路径栏

1. 在文件管理器顶部，点击路径栏（显示当前路径的地方）
2. 直接输入项目路径：
   - `/root/linklore`
   - 或 `/www/wwwroot/linklore`
3. 按 `Enter` 或点击 **转到**

### 方法 2：逐级导航

1. 点击路径栏中的 **根目录**
2. 进入 `root` 文件夹
3. 查看是否有 `linklore` 文件夹

或者：

1. 点击路径栏中的 **wwwroot**
2. 查看是否有 `linklore` 文件夹

---

## 在终端中查找项目

如果找不到，可以在终端中执行：

```bash
# 查找项目目录
find / -name "linklore" -type d 2>/dev/null

# 或者查找 .env.production 文件
find / -name ".env.production" 2>/dev/null | grep linklore
```

---

## 常见项目位置

### 位置 1：/root/linklore

如果项目在 `/root/linklore`：

1. 在文件管理器中，点击路径栏
2. 输入：`/root/linklore`
3. 按 `Enter`

### 位置 2：/www/wwwroot/linklore

如果项目在 `/www/wwwroot/linklore`：

1. 在文件管理器中，点击路径栏中的 **wwwroot**
2. 查看是否有 `linklore` 文件夹
3. 如果有，点击进入

---

## 找到项目后的操作

1. 进入项目目录
2. 进入 `apps` 文件夹
3. 进入 `web` 文件夹
4. 找到或创建 `.env.production` 文件
5. 点击文件名进行编辑

完整路径应该是：
- `/root/linklore/apps/web/.env.production`
- 或 `/www/wwwroot/linklore/apps/web/.env.production`

---

## 如果项目不存在

如果找不到项目目录，说明项目还没有克隆或上传。需要先：

1. **通过 Git 克隆**（如果已推送到 GitHub）：
   ```bash
   cd /root
   git clone https://github.com/Miyazak1/linklore.git
   ```

2. **或通过宝塔面板上传**：
   - 在文件管理器中进入 `/root` 或 `/www/wwwroot`
   - 上传项目压缩包并解压

---

## 快速检查

在终端中执行：

```bash
# 检查项目是否存在
ls -la /root/linklore
ls -la /www/wwwroot/linklore

# 检查环境变量文件
ls -la /root/linklore/apps/web/.env.production
ls -la /www/wwwroot/linklore/apps/web/.env.production
```











