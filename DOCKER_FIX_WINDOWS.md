# Docker Desktop 修复指南（Windows）

## 问题诊断

错误信息：
```
error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/containers/json": 
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

**原因**：Docker Desktop 没有启动或未正确运行。

---

## 解决方案 1：启动 Docker Desktop（推荐）

### 步骤 1：启动 Docker Desktop

1. **按 `Win` 键，搜索 "Docker Desktop"**
2. **点击打开 Docker Desktop**
3. **等待 Docker Desktop 完全启动**（通常需要 30-60 秒）
   - 任务栏会出现 Docker 图标（鲸鱼图标）
   - 图标不再显示动画时表示已启动完成

### 步骤 2：验证 Docker 运行

在 PowerShell 中执行：

```powershell
cd F:\SITE\linklore
docker ps
```

**期望输出**：应该显示一个表格（可能是空的），而不是错误信息。

### 步骤 3：启动 Redis 容器

```powershell
cd F:\SITE\linklore
docker-compose up -d
```

**期望输出**：
```
[+] Running 2/2
 ✔ Network linklore_default      Created
 ✔ Container linklore-redis      Started
```

### 步骤 4：验证 Redis 运行

```powershell
docker ps
```

应该看到 `linklore-redis` 容器在运行。

### 步骤 5：测试 Redis 连接

```powershell
docker exec -it linklore-redis redis-cli ping
```

**期望输出**：`PONG`

---

## 解决方案 2：配置 Docker Desktop 自动启动

如果不想每次手动启动 Docker Desktop：

1. **打开 Docker Desktop**
2. **点击右上角的齿轮图标（设置）**
3. **在左侧菜单选择 "General"**
4. **勾选 "Start Docker Desktop when you sign in to your computer"**
5. **点击 "Apply & Restart"**

---

## 解决方案 3：不使用 Docker，直接运行 Redis（Windows 原生）

如果不想使用 Docker Desktop，可以直接在 Windows 上运行 Redis。

### 方法 A：使用 WSL 运行 Redis（推荐）

```powershell
# 安装 WSL（如果未安装）
wsl --install

# 重启电脑后，在 PowerShell 中进入 WSL
wsl

# 在 WSL 中安装 Redis
sudo apt update
sudo apt install redis-server -y

# 启动 Redis
sudo service redis-server start

# 测试
redis-cli ping
# 应该显示 PONG

# 退出 WSL
exit
```

### 方法 B：使用 Windows 版 Redis（不推荐）

1. **下载 Redis for Windows**：
   - 访问：https://github.com/tporadowski/redis/releases
   - 下载最新版本的 `Redis-x64-xxx.zip`

2. **解压到合适的位置**（例如 `C:\Redis`）

3. **启动 Redis**：
   ```powershell
   cd C:\Redis
   .\redis-server.exe
   ```

4. **保持窗口打开**，Redis 会一直运行

5. **在另一个 PowerShell 窗口测试**：
   ```powershell
   cd C:\Redis
   .\redis-cli.exe ping
   ```

---

## 解决方案 4：检查 Docker Desktop 是否正确安装

如果 Docker Desktop 无法启动：

### 4.1 检查系统要求

- **Windows 10/11 Pro, Enterprise 或 Education**（64位）
- **启用 WSL 2** 或 **Hyper-V**
- **至少 4GB RAM**
- **BIOS 中启用虚拟化**

### 4.2 启用 WSL 2（推荐）

```powershell
# 以管理员身份运行 PowerShell
wsl --install
wsl --set-default-version 2
```

重启电脑后，再启动 Docker Desktop。

### 4.3 启用 Hyper-V（备选）

1. 按 `Win + R`，输入 `optionalfeatures`
2. 勾选 "Hyper-V"
3. 重启电脑

### 4.4 检查 BIOS 虚拟化

1. 重启电脑，进入 BIOS（通常按 `F2`、`F10` 或 `Del`）
2. 找到 "Virtualization Technology" 或 "Intel VT-x" / "AMD-V"
3. 设置为 "Enabled"
4. 保存并退出

### 4.5 重新安装 Docker Desktop

如果以上都不行：

1. **卸载 Docker Desktop**：
   - 控制面板 → 程序 → 卸载程序
   - 找到 "Docker Desktop" → 卸载

2. **下载最新版本**：
   - https://www.docker.com/products/docker-desktop/

3. **重新安装**，选择 "Use WSL 2 instead of Hyper-V"

4. **重启电脑**

---

## 常见问题

### Q1: Docker Desktop 启动很慢

**A**: 这是正常的，首次启动或系统资源紧张时可能需要 1-2 分钟。

### Q2: 提示 "WSL 2 installation is incomplete"

**A**: 
```powershell
# 以管理员身份运行
wsl --update
wsl --set-default-version 2
```

然后重启 Docker Desktop。

### Q3: 端口 6379 被占用

**A**: 
```powershell
# 查看谁占用了 6379 端口
netstat -ano | findstr :6379

# 如果是其他 Redis，停止它
# 或者修改 docker-compose.yml 使用其他端口
```

### Q4: 容器无法启动

**A**:
```powershell
# 查看详细日志
docker-compose logs redis

# 停止并删除容器，重新创建
docker-compose down
docker-compose up -d
```

---

## 快速检查清单

启动 Docker 方式的检查清单：

- [ ] Docker Desktop 已安装
- [ ] Docker Desktop 已启动（任务栏有鲸鱼图标）
- [ ] `docker ps` 命令可以正常运行
- [ ] `docker-compose up -d` 启动容器
- [ ] `docker ps` 可以看到 `linklore-redis` 容器
- [ ] `docker exec -it linklore-redis redis-cli ping` 返回 `PONG`

或者使用 WSL Redis 的检查清单：

- [ ] WSL 已安装
- [ ] Redis 已在 WSL 中安装
- [ ] `sudo service redis-server start` 启动 Redis
- [ ] `redis-cli ping` 返回 `PONG`

---

## 下一步

Redis 运行后，继续项目安装：

```powershell
cd F:\SITE\linklore

# 如果还没安装依赖
pnpm install

# 运行数据库迁移
pnpm prisma:generate
pnpm prisma:migrate

# 启动开发服务器（需要两个窗口）
# 窗口 1：
pnpm dev

# 窗口 2：
pnpm --filter @linklore/ai-queue dev
```

---

## 推荐方案总结

**最简单的方式**（如果已经安装 Docker Desktop）：
1. 启动 Docker Desktop
2. 等待完全启动
3. 运行 `docker-compose up -d`

**如果 Docker Desktop 有问题**：
1. 使用 WSL + Redis（更轻量，不需要 Docker Desktop）
2. 按照上面的 "方法 A：使用 WSL 运行 Redis" 操作

---

## 需要帮助？

如果遇到其他问题，请提供：
1. 错误信息截图
2. `docker version` 输出
3. `wsl --status` 输出（如果使用 WSL）




