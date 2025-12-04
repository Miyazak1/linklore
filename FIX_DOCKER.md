# Docker Desktop 无法启动修复指南

## 问题：Docker Desktop is unable to start

## 解决方案

### 步骤 1：结束所有 Docker 相关进程

在 PowerShell 中执行（**以管理员身份运行**）：

```powershell
# 结束所有 Docker 进程
taskkill /F /IM "Docker Desktop.exe"
taskkill /F /IM "com.docker.backend.exe"
taskkill /F /IM "com.docker.build.exe"
taskkill /F /IM "com.docker.proxy.exe"
taskkill /F /IM "vpnkit.exe"
taskkill /F /IM "dockerd.exe"

# 等待几秒确保进程完全结束
Start-Sleep -Seconds 3

# 再次检查是否还有 Docker 进程
tasklist | findstr docker
```

如果还有进程，手动结束它们。

### 步骤 2：清理 Docker 临时文件（可选）

```powershell
# 清理 Docker 日志（不会删除容器和镜像）
Remove-Item -Recurse -Force "$env:APPDATA\Docker" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Docker" -ErrorAction SilentlyContinue
```

### 步骤 3：重新启动 Docker Desktop

1. 按 `Win` 键，搜索 "Docker Desktop"
2. **以管理员身份运行** Docker Desktop
3. 等待完全启动（可能需要 2-3 分钟）

### 步骤 4：检查 Docker Desktop 日志

如果还是无法启动，查看日志：

```powershell
# 查看 Docker Desktop 日志位置
# 通常在：%LOCALAPPDATA%\Docker\log.txt
notepad "$env:LOCALAPPDATA\Docker\log.txt"
```

### 步骤 5：检查 WSL 2（如果使用 WSL 2）

```powershell
# 检查 WSL 状态
wsl --status

# 如果 WSL 有问题，更新并重启
wsl --update
wsl --shutdown

# 等待 10 秒
Start-Sleep -Seconds 10

# 重新启动 Docker Desktop
```

### 步骤 6：修复 Docker Desktop

1. 打开 Docker Desktop（如果能打开）
2. 点击右上角设置（齿轮图标）
3. 选择 "Troubleshoot"
4. 点击 "Clean / Purge data"
5. 或者点击 "Reset to factory defaults"
6. 重启 Docker Desktop

### 步骤 7：检查系统要求

确保满足以下要求：

- **Windows 10/11** (64位)
- **启用虚拟化**（在 BIOS 中）
- **WSL 2** 或 **Hyper-V** 已启用
- **至少 4GB RAM**

检查虚拟化：
```powershell
# 在任务管理器中查看 CPU → 虚拟化是否显示"已启用"
# 或者运行：
systeminfo | findstr /C:"Hyper-V"
```

### 步骤 8：重新安装 Docker Desktop（最后手段）

如果以上都不行：

1. **卸载 Docker Desktop**
   - 控制面板 → 程序 → 卸载程序
   - 找到 "Docker Desktop" → 卸载

2. **清理残留文件**
   ```powershell
   # 删除 Docker 配置和数据（会删除所有容器和镜像）
   Remove-Item -Recurse -Force "$env:USERPROFILE\.docker" -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force "$env:APPDATA\Docker" -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Docker" -ErrorAction SilentlyContinue
   ```

3. **重新下载并安装**
   - 访问：https://www.docker.com/products/docker-desktop/
   - 下载最新版本
   - 安装时选择 "Use WSL 2 instead of Hyper-V"（推荐）

4. **重启电脑**

---

## 快速修复脚本

将以下内容保存为 `fix-docker.ps1`，然后**以管理员身份运行**：

```powershell
# 结束所有 Docker 进程
Write-Host "正在结束 Docker 进程..." -ForegroundColor Yellow
taskkill /F /IM "Docker Desktop.exe" 2>$null
taskkill /F /IM "com.docker.backend.exe" 2>$null
taskkill /F /IM "com.docker.build.exe" 2>$null
taskkill /F /IM "com.docker.proxy.exe" 2>$null
taskkill /F /IM "vpnkit.exe" 2>$null
taskkill /F /IM "dockerd.exe" 2>$null

Start-Sleep -Seconds 3

# 检查是否还有进程
$remaining = tasklist | findstr docker
if ($remaining) {
    Write-Host "警告：仍有 Docker 进程在运行" -ForegroundColor Red
    Write-Host $remaining
} else {
    Write-Host "所有 Docker 进程已结束" -ForegroundColor Green
}

Write-Host "`n请手动重新启动 Docker Desktop" -ForegroundColor Cyan
```

---

## 常见错误和解决方案

### 错误 1：WSL 2 installation is incomplete

```powershell
wsl --update
wsl --set-default-version 2
```

然后重启电脑。

### 错误 2：Virtualization is not enabled

1. 重启电脑，进入 BIOS（通常按 F2、F10 或 Del）
2. 找到 "Virtualization Technology" 或 "Intel VT-x" / "AMD-V"
3. 设置为 "Enabled"
4. 保存并退出

### 错误 3：Docker Desktop keeps crashing

1. 检查 Windows 事件查看器中的错误
2. 更新 Windows 到最新版本
3. 更新 Docker Desktop 到最新版本
4. 如果使用 Hyper-V，尝试切换到 WSL 2

---

## 验证修复

修复后，运行以下命令验证：

```powershell
# 检查 Docker 版本
docker version

# 检查 Docker 信息
docker info

# 测试运行容器
docker run hello-world
```

如果都能正常运行，说明修复成功！




