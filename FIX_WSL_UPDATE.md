# WSL 更新卡住解决方案

## 问题：WSL 更新一直卡在 2%

## 解决方案

### 方案 1：取消并手动下载 WSL 内核（推荐）

1. **按 `Ctrl + C` 取消当前更新**

2. **手动下载 WSL 内核更新包**
   - 访问：https://aka.ms/wsl2kernel
   - 或者直接下载：https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi
   - 下载 `wsl_update_x64.msi` 文件

3. **安装更新包**
   - 双击下载的 `.msi` 文件
   - 按照提示完成安装

4. **验证安装**
   ```powershell
   wsl --status
   ```

5. **重启 WSL**
   ```powershell
   wsl --shutdown
   Start-Sleep -Seconds 5
   wsl --status
   ```

### 方案 2：启用 Windows Update

WSL 更新需要 Windows Update 服务运行。

1. **检查 Windows Update 状态**
   ```powershell
   # 查看 Windows Update 服务状态
   Get-Service -Name wuauserv
   ```

2. **启用 Windows Update（如果需要）**
   ```powershell
   # 以管理员身份运行 PowerShell
   # 启动 Windows Update 服务
   Start-Service -Name wuauserv
   
   # 设置为自动启动
   Set-Service -Name wuauserv -StartupType Automatic
   ```

3. **在 Windows 设置中启用更新**
   - 按 `Win + I` 打开设置
   - 进入 "更新和安全" → "Windows Update"
   - 点击 "恢复更新" 或 "检查更新"
   - 确保 "在更新 Windows 时接收其他 Microsoft 产品的更新" 已启用

4. **重新运行 WSL 更新**
   ```powershell
   wsl --update
   ```

### 方案 3：使用代理或镜像（如果网络慢）

如果下载很慢，可以：

1. **使用代理**（如果有）
   ```powershell
   # 设置代理（替换为你的代理地址）
   $env:HTTP_PROXY="http://proxy.example.com:8080"
   $env:HTTPS_PROXY="http://proxy.example.com:8080"
   wsl --update
   ```

2. **或者直接下载安装包**（方案 1）

### 方案 4：清理并重新安装 WSL

如果以上都不行：

```powershell
# 1. 关闭 WSL
wsl --shutdown

# 2. 卸载 WSL（可选，会删除所有 WSL 发行版）
# wsl --unregister <发行版名称>

# 3. 重新安装 WSL
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 4. 重启电脑

# 5. 手动下载并安装 WSL 内核（方案 1）
```

---

## 快速解决步骤（推荐）

**最快的方法**：

1. **按 `Ctrl + C` 取消当前更新**

2. **打开浏览器，访问**：
   ```
   https://aka.ms/wsl2kernel
   ```
   或直接下载：
   ```
   https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi
   ```

3. **下载完成后，双击 `.msi` 文件安装**

4. **安装完成后，验证**：
   ```powershell
   wsl --status
   ```

5. **重启 WSL**：
   ```powershell
   wsl --shutdown
   ```

6. **重新启动 Docker Desktop**

---

## 验证修复

修复后，运行：

```powershell
# 检查 WSL 状态
wsl --status
# 应该显示版本信息，不再提示内核文件缺失

# 检查 Docker
docker version
# 应该能正常连接，不再有 500 错误
```

---

## 如果还是不行

如果手动安装内核后还是有问题：

1. **检查系统要求**
   - Windows 10 版本 1903 或更高
   - 64 位系统
   - 启用了虚拟化

2. **检查事件查看器**
   ```powershell
   eventvwr.msc
   ```
   查看 "Windows 日志" → "应用程序" 中的错误

3. **尝试重启电脑**

4. **如果使用 Hyper-V，尝试切换到 WSL 2**




