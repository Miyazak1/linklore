# LinkLore 宝塔面板更新指南

**目标**：清理旧部署并拉取最新代码  
**环境**：宝塔面板 + Linux 服务器  
**预计时间**：10-15 分钟

---

## 一、目标（一句话）

停止所有 PM2 进程，拉取 GitHub 最新代码，更新依赖并重新构建项目。

---

## 二、变更清单

### 服务器端操作

**需要执行的操作**：
1. 停止所有 PM2 进程（linklore-web, linklore-worker, linklore-baike-scheduler）
2. 拉取最新 Git 代码
3. 更新项目依赖
4. 重新生成 Prisma Client
5. 运行数据库迁移（可选）
6. 重新构建项目
7. 重启 PM2 服务

---

## 三、实现方案（面向非程序员）

### 为什么需要清理？

1. **避免文件冲突**：停止服务后再更新代码，避免文件被占用
2. **确保最新代码**：从 GitHub 拉取最新代码，包括样式更新
3. **依赖同步**：更新依赖包，确保与最新代码兼容
4. **构建更新**：重新构建项目，应用最新更改

### 更新流程

1. **停止服务**：先停止所有运行中的进程
2. **拉取代码**：从 GitHub 获取最新代码
3. **更新依赖**：安装/更新项目依赖
4. **重新构建**：编译项目代码
5. **重启服务**：启动 PM2 进程

### 风险说明

- **服务中断**：更新期间网站无法访问（约 5-10 分钟）
- **数据安全**：不会影响数据库数据
- **配置保留**：环境变量和配置文件会保留

### 回退方式

如果更新后出现问题：
1. 使用 Git 回退到之前的提交
2. 重新运行更新脚本
3. 或联系技术支持

---

## 四、更新步骤（详细操作）

### 方式1：使用更新脚本（推荐）

#### 步骤 1：登录宝塔面板终端

1. 登录宝塔面板
2. 点击左侧菜单 **终端**
3. 进入项目目录：
   ```bash
   cd /www/wwwroot/linklore
   ```
   （如果项目目录名不同，请替换为实际目录名）

#### 步骤 2：运行更新脚本

```bash
# 给脚本添加执行权限（首次运行）
chmod +x infrastructure/scripts/update-bt.sh

# 运行更新脚本
./infrastructure/scripts/update-bt.sh
```

**脚本会自动执行**：
- 停止所有 PM2 进程
- 询问是否删除 PM2 配置（建议选择 n，保留配置）
- 拉取最新代码
- 检查 Node.js 和 pnpm
- 更新依赖
- 生成 Prisma Client
- 询问是否运行数据库迁移（如果有新迁移，选择 y）
- 构建项目

**预期结果**：看到 "更新完成！" 提示

---

### 方式2：手动执行（如果脚本失败）

#### 步骤 1：停止 PM2 进程

```bash
cd /www/wwwroot/linklore

# 停止所有进程
pm2 stop all

# 查看状态确认已停止
pm2 status
```

**预期结果**：所有进程状态显示为 `stopped`

---

#### 步骤 2：拉取最新代码

```bash
# 确认当前分支
git branch --show-current

# 拉取最新代码（假设是 master 分支）
git pull origin master

# 如果遇到冲突，需要先解决冲突
# git status  # 查看冲突文件
# 手动解决冲突后，git add . && git commit
```

**预期结果**：看到 "Already up to date" 或 "Updating..." 信息

---

#### 步骤 3：更新依赖

```bash
# 确保 pnpm 已安装
corepack enable
corepack prepare pnpm@9.0.0 --activate

# 更新依赖
pnpm install --frozen-lockfile
```

**预期结果**：依赖安装完成，无错误

---

#### 步骤 4：生成 Prisma Client

```bash
pnpm prisma:generate
```

**预期结果**：看到 "Generated Prisma Client" 信息

---

#### 步骤 5：运行数据库迁移（可选）

```bash
# 如果有新的数据库迁移，运行：
pnpm prisma:migrate

# 如果没有新迁移，会提示 "Already up to date"
```

**预期结果**：迁移完成或提示已是最新

---

#### 步骤 6：构建项目

```bash
pnpm build
```

**预期结果**：构建成功，看到 "Compiled successfully" 或类似信息

---

#### 步骤 7：重启 PM2 服务

```bash
# 方式1：使用 ecosystem.config.js（推荐）
pm2 restart ecosystem.config.js

# 方式2：如果方式1失败，先删除再启动
pm2 delete all
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志（如果有问题）
pm2 logs
```

**预期结果**：
- `pm2 status` 显示所有进程为 `online`
- 进程包括：linklore-web, linklore-worker, linklore-baike-scheduler

---

## 五、验证更新

### 测试用例 TC-2025-UPDATE-001：服务状态检查

- **前置条件**：更新脚本已执行完成
- **操作步骤**：
  1. 在终端执行：`pm2 status`
  2. 检查所有进程状态
  3. 执行：`pm2 logs --lines 20` 查看最近日志
- **预期结果**：
  - 所有进程状态为 `online`
  - 日志中无错误信息
- **实际结果**：（由你填写）

---

### 测试用例 TC-2025-UPDATE-002：网站访问检查

- **前置条件**：PM2 服务已启动
- **操作步骤**：
  1. 在浏览器访问你的网站
  2. 检查页面是否正常加载
  3. 检查样式是否已更新（新的蓝色主题）
  4. 测试登录功能
- **预期结果**：
  - 网站正常访问
  - 界面显示新的现代风格（蓝色主题）
  - 功能正常
- **实际结果**：（由你填写）

---

### 测试用例 TC-2025-UPDATE-003：功能测试

- **前置条件**：网站已正常访问
- **操作步骤**：
  1. 测试聊天功能
  2. 测试图书馆功能
  3. 测试游戏功能
- **预期结果**：
  - 所有功能正常工作
  - 无错误提示
- **实际结果**：（由你填写）

---

## 六、常见问题

### 问题1：Git 拉取失败

**错误信息**：
```
error: Your local changes to the following files would be overwritten by merge
```

**解决方法**：
```bash
# 查看哪些文件有本地修改
git status

# 方式1：保存本地修改（推荐）
git stash
git pull origin master
git stash pop

# 方式2：放弃本地修改（谨慎使用）
git reset --hard HEAD
git pull origin master
```

---

### 问题2：PM2 进程无法启动

**错误信息**：
```
Error: spawn pnpm ENOENT
```

**解决方法**：
```bash
# 检查 pnpm 是否安装
which pnpm

# 如果未安装，安装 pnpm
corepack enable
corepack prepare pnpm@9.0.0 --activate

# 重新启动
pm2 restart ecosystem.config.js
```

---

### 问题3：构建失败

**错误信息**：
```
Error: Cannot find module 'xxx'
```

**解决方法**：
```bash
# 清理并重新安装依赖
rm -rf node_modules
rm -rf apps/web/node_modules
pnpm install --frozen-lockfile
pnpm build
```

---

### 问题4：数据库迁移失败

**错误信息**：
```
Migration failed
```

**解决方法**：
```bash
# 查看迁移状态
pnpm prisma migrate status

# 如果有失败的迁移，查看错误信息
# 根据错误信息解决后，重新运行迁移
pnpm prisma migrate deploy
```

---

## 七、回退与已知问题

### 回退方式

如果更新后出现问题，可以回退到之前的版本：

```bash
cd /www/wwwroot/linklore

# 查看提交历史
git log --oneline -10

# 回退到指定提交（替换 COMMIT_HASH）
git reset --hard <COMMIT_HASH>

# 重新构建和启动
pnpm build
pm2 restart ecosystem.config.js
```

### 已知问题/限制

- 更新期间服务会中断（约 5-10 分钟）
- 如果有未提交的本地修改，需要先处理
- 数据库迁移可能需要额外时间

---

## 八、版本信息

- **脚本版本**：v1.0.0
- **更新时间**：2025-01-27
- **适用环境**：宝塔面板 + Linux 服务器

---

## 九、后续建议

1. **定期更新**：建议每周或每月更新一次
2. **备份数据**：更新前备份重要数据（虽然脚本不会删除数据）
3. **监控日志**：更新后检查 PM2 日志，确保无错误
4. **测试功能**：更新后测试主要功能，确保正常

---

**完成！你的网站已更新到最新版本！**

