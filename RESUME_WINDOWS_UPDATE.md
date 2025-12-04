# 恢复 Windows Update 以修复 WSL 更新

## 问题：Windows 更新已暂停

从 `wsl --status` 输出可以看到：**Windows 更新已暂停**，这导致 WSL 更新无法进行。

## 解决方案

### 方法 1：通过 Windows 设置恢复更新（最简单）

1. **按 `Win + I` 打开 Windows 设置**

2. **进入"更新和安全"或"Windows Update"**

3. **点击"恢复更新"或"继续更新"按钮**

4. **确保启用"在更新 Windows 时接收其他 Microsoft 产品的更新"**
   - 在 Windows Update 设置中
   - 找到"高级选项"或"其他选项"
   - 勾选"在更新 Windows 时接收其他 Microsoft 产品的更新"

5. **重新运行 WSL 更新**
   ```powershell
   wsl --update
   ```

### 方法 2：通过 PowerShell 恢复更新（管理员）

```powershell
# 以管理员身份运行 PowerShell

# 1. 启动 Windows Update 服务
Start-Service -Name wuauserv

# 2. 设置为自动启动
Set-Service -Name wuauserv -StartupType Automatic

# 3. 恢复 Windows Update（如果被暂停）
# 通过注册表恢复
$regPath = "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings"
if (Test-Path $regPath) {
    Remove-ItemProperty -Path $regPath -Name "PauseFeatureUpdates" -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $regPath -Name "PauseQualityUpdates" -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $regPath -Name "PauseUpdates" -ErrorAction SilentlyContinue
}

# 4. 检查服务状态
Get-Service -Name wuauserv

# 5. 重新运行 WSL 更新
wsl --update
```

### 方法 3：手动下载安装 WSL 内核（最快，不依赖 Windows Update）

如果不想恢复 Windows Update，可以直接手动安装：

1. **访问并下载**：
   - https://aka.ms/wsl2kernel
   - 或直接：https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi

2. **安装下载的 `.msi` 文件**

3. **验证**：
   ```powershell
   wsl --status
   ```

---

## 推荐流程

**最快的方法**（不依赖 Windows Update）：

1. **手动下载 WSL 内核**：
   - 浏览器打开：https://aka.ms/wsl2kernel
   - 下载 `wsl_update_x64.msi`

2. **安装**：
   - 双击 `.msi` 文件
   - 按提示完成安装

3. **验证**：
   ```powershell
   wsl --status
   ```

4. **重启 WSL**：
   ```powershell
   wsl --shutdown
   ```

5. **启动 Docker Desktop**

---

## 验证修复

修复后：

```powershell
# 检查 WSL 状态（应该不再提示更新问题）
wsl --status

# 检查 Docker
docker version
# 应该能正常连接，不再有 500 错误

# 启动 Redis
cd F:\SITE\linklore
docker-compose up -d
```




