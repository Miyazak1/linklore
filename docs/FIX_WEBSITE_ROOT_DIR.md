# 修复网站根目录问题

## 当前情况

- **网站根目录**：`/www/wwwroot/www.mooyu.fun`（宝塔自动创建）
- **项目实际位置**：`/www/wwwroot/linklore`
- **问题**：网站根目录和项目位置不一致

---

## 解决方案

### 方案 1：修改网站根目录（推荐）

在宝塔面板中修改网站根目录：

1. **进入网站设置**
   - 在网站列表中，找到 `www.mooyu.fun`
   - 点击右侧的 **设置** 按钮

2. **修改网站目录**
   - 点击 **网站目录** 标签
   - 将 **网站目录** 改为：`/www/wwwroot/linklore`
   - 点击 **保存**

3. **配置反向代理**
   - 点击 **反向代理** 标签
   - 点击 **添加反向代理**
   - 填写：
     - **代理名称**：`linklore`
     - **目标 URL**：`http://127.0.0.1:3000`
     - **发送域名**：`$host`
   - 点击 **提交**

---

### 方案 2：使用符号链接（如果方案1不行）

在终端执行：

```bash
# 进入 wwwroot 目录
cd /www/wwwroot

# 删除或重命名自动创建的目录（如果为空）
# 注意：如果目录有重要文件，先备份
rm -rf www.mooyu.fun

# 创建符号链接，指向项目目录
ln -s /www/wwwroot/linklore /www/wwwroot/www.mooyu.fun

# 验证
ls -la /www/wwwroot/www.mooyu.fun
# 应该显示指向 linklore 的符号链接
```

---

### 方案 3：重新创建网站（如果方案1和2都不行）

1. **删除现有网站**
   - 在宝塔面板网站列表中
   - 找到 `www.mooyu.fun`
   - 点击 **删除** 按钮
   - 确认删除（选择不删除网站目录，只删除配置）

2. **重新添加网站**
   - 点击 **添加站点**
   - **域名**：`www.mooyu.fun` 和 `mooyu.fun`
   - **根目录**：`/www/wwwroot/linklore`（手动填写，不要使用默认）
   - **PHP 版本**：纯静态
   - 点击 **提交**

3. **配置反向代理和 SSL**（同方案1的步骤3）

---

## 推荐操作流程

### 最简单的方法：修改网站目录

1. **在宝塔面板中**：
   - 网站 → 找到 `www.mooyu.fun` → 点击 **设置**
   - 点击 **网站目录** 标签
   - 将目录改为：`/www/wwwroot/linklore`
   - 点击 **保存**

2. **配置反向代理**：
   - 点击 **反向代理** 标签
   - 添加反向代理：
     - 目标 URL：`http://127.0.0.1:3000`
     - 发送域名：`$host`
   - 保存

3. **配置 SSL**：
   - 点击 **SSL** 标签
   - 申请 Let's Encrypt 证书
   - 启用强制 HTTPS

4. **更新环境变量**：
   ```bash
   cd /www/wwwroot/linklore
   nano apps/web/.env.production
   ```
   添加或修改：
   ```bash
   NEXT_PUBLIC_APP_URL="https://www.mooyu.fun"
   ```
   保存后重启：
   ```bash
   pm2 restart linklore-web
   ```

---

## 验证

配置完成后：

1. **检查网站目录**
   ```bash
   # 在宝塔文件管理器中，进入 www.mooyu.fun
   # 应该看到 linklore 项目的文件（apps, components 等）
   ```

2. **访问网站**
   - 浏览器访问：`https://www.mooyu.fun`
   - 应该看到 LinkLore 首页

3. **检查 PM2 服务**
   ```bash
   pm2 status
   ```
   所有服务应该是 `online`

---

**完成！网站现在指向正确的项目目录了！**

