# 为 www.mooyu.fun 配置网站

**目标**：在宝塔面板中为 `www.mooyu.fun` 配置网站和反向代理  
**前提**：PM2 服务已正常运行（端口 3000）

---

## 一、添加网站

### 步骤 1：登录宝塔面板

1. 访问：`http://你的服务器IP:8888`
2. 使用用户名和密码登录

### 步骤 2：添加站点

1. 点击左侧菜单 **网站**
2. 点击 **添加站点** 按钮

### 步骤 3：填写网站信息

- **域名**：填写以下内容（每行一个）：
  ```
  www.mooyu.fun
  mooyu.fun
  ```

- **备注**：`LinkLore 应用`（可选）

- **根目录**：`/www/wwwroot/linklore`（或保持默认）

- **FTP**：不创建（不需要）

- **数据库**：不创建（已存在）

- **PHP 版本**：选择 **纯静态**（不需要 PHP）

### 步骤 4：提交

点击 **提交** 按钮

---

## 二、配置反向代理

### 步骤 1：进入网站设置

1. 在网站列表中，找到 `www.mooyu.fun`
2. 点击右侧的 **设置** 按钮

### 步骤 2：配置反向代理

1. 点击 **反向代理** 标签
2. 点击 **添加反向代理** 按钮

### 步骤 3：填写代理信息

- **代理名称**：`linklore`（任意名称）
- **目标 URL**：`http://127.0.0.1:3000`
- **发送域名**：`$host`
- **其他选项**：保持默认

### 步骤 4：保存

点击 **提交** 按钮

---

## 三、配置 SSL 证书（HTTPS）

### 步骤 1：进入 SSL 设置

在网站设置中，点击 **SSL** 标签

### 步骤 2：申请免费证书

1. 选择 **Let's Encrypt**（免费）
2. 勾选你的域名：
   - `www.mooyu.fun`
   - `mooyu.fun`
3. 点击 **申请** 按钮
4. 等待证书申请完成（约 1-2 分钟）

### 步骤 3：启用 HTTPS

1. 申请成功后，开启 **强制 HTTPS**
2. 点击 **保存** 按钮

---

## 四、更新环境变量（重要！）

### 步骤 1：编辑环境变量文件

在宝塔面板终端执行：

```bash
cd /www/wwwroot/linklore

# 编辑环境变量文件
nano apps/web/.env.production
```

### 步骤 2：更新域名配置

找到或添加这一行：

```bash
NEXT_PUBLIC_APP_URL="https://www.mooyu.fun"
```

**重要**：这个配置必须正确，否则 Server Actions 无法正常工作！

### 步骤 3：保存并重启服务

```bash
# 保存文件（在 nano 中：Ctrl+O, Enter, Ctrl+X）

# 重启服务以应用新配置
pm2 restart linklore-web
```

---

## 五、验证配置

### 1. 检查 PM2 服务

```bash
pm2 status
```

应该看到所有服务都是 `online`

### 2. 访问网站

在浏览器中访问：
- `https://www.mooyu.fun`
- 或 `https://mooyu.fun`

应该看到 LinkLore 首页，新样式正常显示（蓝色主题）

### 3. 测试功能

- 测试注册功能
- 测试登录功能
- 测试聊天功能
- 测试图书馆功能

---

## 六、配置检查清单

完成配置后，检查以下项：

- [ ] 网站已添加（域名：`www.mooyu.fun`）
- [ ] 反向代理已配置（目标：`http://127.0.0.1:3000`）
- [ ] SSL 证书已申请并启用
- [ ] 强制 HTTPS 已开启
- [ ] 环境变量已更新（`NEXT_PUBLIC_APP_URL="https://www.mooyu.fun"`）
- [ ] PM2 服务正常运行
- [ ] 可以通过域名访问网站
- [ ] 新样式正常显示

---

## 七、如果遇到问题

### 问题 1：502 Bad Gateway

**解决方法**：
```bash
# 检查 PM2 状态
pm2 status

# 如果服务没有运行，启动它
pm2 restart ecosystem.config.js
```

### 问题 2：SSL 证书申请失败

**可能原因**：
1. 域名 DNS 未解析到服务器 IP
2. 80 端口被占用

**解决方法**：
```bash
# 检查域名 DNS 解析
ping www.mooyu.fun

# 应该显示你的服务器 IP
```

### 问题 3：环境变量未生效

**解决方法**：
```bash
cd /www/wwwroot/linklore

# 检查环境变量文件
cat apps/web/.env.production | grep NEXT_PUBLIC_APP_URL

# 应该显示：NEXT_PUBLIC_APP_URL="https://www.mooyu.fun"

# 如果不对，重新编辑
nano apps/web/.env.production

# 重启服务
pm2 restart linklore-web
```

---

**完成！你的网站现在可以通过 https://www.mooyu.fun 访问了！**

