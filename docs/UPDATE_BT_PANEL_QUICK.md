# 宝塔面板快速更新步骤

## 问题：脚本文件不存在

如果遇到 `No such file or directory` 错误，说明服务器上的代码还没有拉取最新版本。

## 解决步骤

### 步骤 1：先拉取最新代码

```bash
# 进入项目目录
cd /www/wwwroot/linklore

# 查看当前状态
git status

# 拉取最新代码
git pull origin master
```

### 步骤 2：然后再运行更新脚本

```bash
# 给脚本添加执行权限
chmod +x infrastructure/scripts/update-bt.sh

# 运行更新脚本
./infrastructure/scripts/update-bt.sh
```

---

## 或者：手动执行更新（不依赖脚本）

如果脚本仍然有问题，可以手动执行以下步骤：

```bash
# 1. 停止所有 PM2 进程
pm2 stop all

# 2. 拉取最新代码
cd /www/wwwroot/linklore
git pull origin master

# 3. 更新依赖
pnpm install --frozen-lockfile

# 4. 生成 Prisma Client
pnpm prisma:generate

# 5. 运行数据库迁移（如果有新迁移）
pnpm prisma:migrate

# 6. 构建项目
pnpm build

# 7. 重启服务
pm2 restart ecosystem.config.js

# 8. 查看状态
pm2 status
```

---

## 如果 git pull 失败

如果 `git pull` 提示有本地修改冲突：

```bash
# 查看哪些文件有修改
git status

# 方式1：保存本地修改（推荐）
git stash
git pull origin master
git stash pop

# 方式2：放弃本地修改（谨慎使用，会丢失本地更改）
git reset --hard HEAD
git pull origin master
```




