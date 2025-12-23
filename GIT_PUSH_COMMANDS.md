# Git 推送和拉取命令

## 本地推送命令（在 Windows 上执行）

### 第一步：添加所有更改

```powershell
# 进入项目根目录
cd F:\SITE\linklore

# 添加所有更改（包括新文件）
git add .

# 或者只添加特定文件
git add apps/web/lib/auth/session.ts
git add apps/web/app/(main)/digest/page.tsx
git add docs/FIX_*.md
```

### 第二步：提交更改

```powershell
git commit -m "修复登录 Cookie Domain 问题

- 修复 Cookie Domain 不匹配问题（mooyu.fun vs www.mooyu.fun）
- 添加 Cookie Domain 配置支持（COOKIE_DOMAIN 环境变量）
- 改进 session 读取日志，便于调试
- 创建 /digest 页面，修复 404 错误
- 添加登录问题诊断文档"
```

### 第三步：推送到 GitHub

```powershell
# 推送到远程仓库
git push origin master

# 如果推送失败，可能需要先拉取
git pull origin master --rebase
git push origin master
```

---

## 服务器拉取命令（在宝塔终端执行）

### 方式 1：简单拉取（推荐）

```bash
cd /www/wwwroot/linklore

# 拉取最新代码
git pull origin master

# 如果有冲突，查看状态
git status

# 如果有冲突，可以重置（谨慎使用，会丢失本地未提交的更改）
# git reset --hard origin/master
```

### 方式 2：安全拉取（保留本地更改）

```bash
cd /www/wwwroot/linklore

# 先保存本地更改（如果有）
git stash

# 拉取最新代码
git pull origin master

# 恢复本地更改（如果有）
git stash pop

# 如果有冲突，解决冲突后：
# git add .
# git commit -m "解决冲突"
```

### 方式 3：强制拉取（覆盖本地更改）

```bash
cd /www/wwwroot/linklore

# 备份当前更改（可选）
cp -r apps/web apps/web.backup

# 强制拉取，覆盖本地更改
git fetch origin
git reset --hard origin/master

# 清理未跟踪的文件（可选）
git clean -fd
```

---

## 拉取后需要执行的步骤

### 1. 安装依赖（如果有新的依赖）

```bash
cd /www/wwwroot/linklore
pnpm install
```

### 2. 重新构建（如果代码有更改）

```bash
# 构建项目
pnpm build
```

### 3. 重启服务

```bash
# 重启 PM2 服务
pm2 restart linklore-web

# 查看日志确认没有错误
pm2 logs linklore-web --lines 20
```

---

## 一键拉取脚本（推荐）

在宝塔终端执行：

```bash
cd /www/wwwroot/linklore && \
echo "==========================================" && \
echo "拉取最新代码并重启服务" && \
echo "==========================================" && \
echo "" && \
echo "[1/4] 拉取最新代码..." && \
git pull origin master && \
echo "✓ 代码已更新" && \
echo "" && \
echo "[2/4] 安装依赖（如果需要）..." && \
pnpm install && \
echo "✓ 依赖已安装" && \
echo "" && \
echo "[3/4] 构建项目..." && \
pnpm build && \
echo "✓ 构建完成" && \
echo "" && \
echo "[4/4] 重启服务..." && \
pm2 restart linklore-web && \
echo "✓ 服务已重启" && \
echo "" && \
echo "==========================================" && \
echo "完成！" && \
echo "==========================================" && \
pm2 status
```

---

## 如果遇到冲突

### 查看冲突文件

```bash
git status
```

### 解决冲突

1. 打开冲突文件
2. 查找 `<<<<<<<`、`=======`、`>>>>>>>` 标记
3. 手动解决冲突
4. 保存文件

### 标记冲突已解决

```bash
git add <冲突文件>
git commit -m "解决冲突"
```

### 如果不想解决冲突，使用远程版本

```bash
git checkout --theirs <冲突文件>
git add <冲突文件>
git commit -m "使用远程版本解决冲突"
```

---

## 检查更新是否成功

```bash
# 查看最新提交
git log -1

# 查看当前分支状态
git status

# 查看 PM2 服务状态
pm2 status

# 查看服务日志
pm2 logs linklore-web --lines 20
```

---

## 注意事项

1. **备份重要数据**：拉取前建议备份数据库和重要文件
2. **检查环境变量**：拉取后检查 `.env.production` 是否被覆盖
3. **测试功能**：拉取后测试登录功能是否正常
4. **查看日志**：拉取后查看服务日志，确认没有错误

