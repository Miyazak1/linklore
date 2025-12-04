# Windows 权限错误解决方案

## 问题：`EPERM: operation not permitted`

这是因为 corepack 需要在 Node.js 安装目录创建文件，但当前用户没有权限。

---

## 解决方案 1：以管理员身份运行（推荐）

### 步骤：

1. **关闭当前的 CMD 窗口**

2. **以管理员身份打开 CMD**：
   - 按 `Win + X`
   - 选择"命令提示符 (管理员)"或"Windows PowerShell (管理员)"
   - 点击"是"确认 UAC 提示

3. **在管理员窗口中执行**：
   ```cmd
   cd F:\SITE\linklore
   corepack enable
   corepack prepare pnpm@9.0.0 --activate
   pnpm --version
   ```

4. **验证成功后，关闭管理员窗口，用普通窗口继续后续操作**

---

## 解决方案 2：使用 npm 安装 pnpm（无需管理员）

如果不想使用管理员权限，可以直接用 npm 安装 pnpm：

```cmd
# 在普通 CMD 窗口中执行
cd F:\SITE\linklore

# 使用 npm 全局安装 pnpm
npm install -g pnpm@9.0.0

# 验证安装
pnpm --version
```

**注意**：这种方式会将 pnpm 安装到全局，但依赖仍然会安装在项目目录下。

---

## 解决方案 3：修复 Node.js 目录权限（高级）

如果你想让 corepack 正常工作，可以修改 Node.js 安装目录的权限：

1. 打开文件管理器，进入 `E:\Node`
2. 右键文件夹 → "属性" → "安全"选项卡
3. 点击"编辑"
4. 选择你的用户账户，勾选"完全控制"
5. 点击"确定"

然后重新执行：
```cmd
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

---

## 推荐操作流程

**最简单的方式**：

1. **以管理员身份打开 CMD**（一次性的）
2. 执行：
   ```cmd
   corepack enable
   corepack prepare pnpm@9.0.0 --activate
   ```
3. **关闭管理员窗口**
4. **用普通 CMD 窗口继续后续操作**：
   ```cmd
   cd F:\SITE\linklore
   pnpm install
   ```

---

## 验证安装

无论用哪种方式，最后都应该能执行：

```cmd
pnpm --version
```

应该显示 `9.0.0`

然后就可以继续安装依赖了：

```cmd
cd F:\SITE\linklore
pnpm install
```










