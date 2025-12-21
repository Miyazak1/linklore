# 服务器配置步骤（已部署后）

## 你的服务器信息
- **公网IP**：47.243.86.148
- **域名**：www.linkloredu.com
- **部署方式**：宝塔面板

---

## 第一步：配置环境变量（重要！）

### 1.1 找到环境变量文件

在服务器上（通过宝塔面板文件管理器或 SSH）：

```bash
# 找到项目目录（通常在宝塔面板中）
cd /www/wwwroot/linklore
# 或者
cd ~/linklore
```

### 1.2 编辑环境变量文件

```bash
nano apps/web/.env.production
```

### 1.3 必须修改的配置

找到并修改这一行：

```bash
# 修改前
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# 修改为
NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"
```

**重要**：这个配置必须正确，否则 Server Actions 无法正常工作！

### 1.4 保存并退出

- 按 `Ctrl + O` 保存
- 按 `Enter` 确认
- 按 `Ctrl + X` 退出

---

## 第二步：在宝塔面板配置网站

### 2.1 添加网站

1. 登录宝塔面板
2. 进入 **网站** 菜单
3. 点击 **添加站点**
4. 配置：
   - **域名**：`linkloredu.com` 和 `www.linkloredu.com`（两个都填）
   - **根目录**：`/www/wwwroot/linklore`（或你的实际项目路径）
   - **PHP 版本**：选择 **纯静态**（不需要 PHP）
   - 其他选项保持默认
5. 点击 **提交**

### 2.2 配置域名解析（如果还没配置）

在域名服务商（如阿里云域名控制台）添加 A 记录：

- **主机记录**：`@` → **记录值**：`47.243.86.148`
- **主机记录**：`www` → **记录值**：`47.243.86.148`

等待 DNS 生效（通常 5-30 分钟）

---

## 第三步：配置 SSL 证书（HTTPS）

### 3.1 申请证书

1. 在宝塔面板的 **网站** 列表中，找到你的域名
2. 点击域名右侧的 **设置**
3. 进入 **SSL** 标签
4. 选择 **Let's Encrypt**（免费证书）
5. 勾选两个域名：
   - `linkloredu.com`
   - `www.linkloredu.com`
6. 点击 **申请**
7. 等待申请完成（通常 1-2 分钟）

### 3.2 开启强制 HTTPS

1. 申请成功后，勾选 **强制 HTTPS**
2. 点击 **保存**

---

## 第四步：配置反向代理

### 4.1 添加反向代理

1. 在网站设置中，进入 **反向代理** 标签
2. 点击 **添加反向代理**
3. 配置：
   - **代理名称**：`linklore`
   - **目标 URL**：`http://127.0.0.1:3000`
   - **发送域名**：`$host`
   - **其他选项**：保持默认
4. 点击 **保存**

### 4.2 修改 Nginx 配置（确保 WebSocket 支持）

1. 在网站设置中，进入 **配置文件** 标签
2. 找到 `location /` 块，确保包含以下配置：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 75s;
    client_max_body_size 25m;
}
```

3. 点击 **保存**
4. 点击 **重载配置**

---

## 第五步：重启服务

### 5.1 重启 PM2 进程

在宝塔面板终端或 SSH 中执行：

```bash
# 进入项目目录
cd /www/wwwroot/linklore
# 或
cd ~/linklore

# 重启所有服务
pm2 restart all

# 查看状态
pm2 status
```

### 5.2 验证服务运行

应该看到两个进程：
- `linklore-web` - 运行中
- `linklore-worker` - 运行中

---

## 第六步：配置防火墙

### 6.1 宝塔面板防火墙

1. 进入 **安全** 菜单
2. 确保以下端口已开放：
   - `80` (HTTP)
   - `443` (HTTPS)
   - `22` (SSH)
   - `3000` **不需要对外开放**（仅本地访问）

### 6.2 阿里云安全组

在阿里云控制台：

1. 进入 **ECS 实例** → 选择你的服务器
2. 点击 **安全组** → **配置规则**
3. 添加入方向规则：
   - **端口**：`80/80`，**协议**：TCP，**授权对象**：`0.0.0.0/0`
   - **端口**：`443/443`，**协议**：TCP，**授权对象**：`0.0.0.0/0`
   - **端口**：`22/22`，**协议**：TCP，**授权对象**：`0.0.0.0/0`（或你的 IP）

---

## 第七步：验证部署

### 7.1 访问网站

在浏览器中访问：

- `https://www.linkloredu.com`
- `https://linkloredu.com`（应该自动跳转到 www）

### 7.2 健康检查

访问：`https://www.linkloredu.com/api/health`

应该返回 JSON 响应，包含：
```json
{
  "ok": true,
  "db": "up",
  ...
}
```

### 7.3 测试功能

1. **匿名访问**：直接访问聊天页面，应该能创建访客账号
2. **注册功能**：测试用户注册
3. **登录功能**：测试用户登录
4. **聊天功能**：测试聊天是否正常

---

## 常见问题排查

### 问题 1：访问网站显示 502 Bad Gateway

**原因**：Next.js 应用没有运行

**解决**：
```bash
# 检查 PM2 状态
pm2 status

# 如果没有运行，启动服务
cd /www/wwwroot/linklore
pm2 start ecosystem.config.js --env production
pm2 save
```

### 问题 2：访问网站显示 404

**原因**：Nginx 配置不正确

**解决**：
1. 检查反向代理是否配置
2. 检查 `proxy_pass` 是否为 `http://127.0.0.1:3000`
3. 重载 Nginx 配置

### 问题 3：Server Actions 不工作

**原因**：`NEXT_PUBLIC_APP_URL` 配置错误

**解决**：
1. 检查 `apps/web/.env.production` 中的 `NEXT_PUBLIC_APP_URL`
2. 确保值为 `https://www.linkloredu.com`
3. 重启 PM2：`pm2 restart all`

### 问题 4：SSL 证书申请失败

**原因**：域名解析未生效或端口未开放

**解决**：
1. 检查域名解析是否生效：`ping www.linkloredu.com`
2. 确保 80 端口已开放（Let's Encrypt 需要）
3. 等待 DNS 生效后重试

---

## 完成检查清单

- [ ] 环境变量 `NEXT_PUBLIC_APP_URL` 已配置为 `https://www.linkloredu.com`
- [ ] 宝塔面板已添加网站（两个域名）
- [ ] SSL 证书已申请并开启强制 HTTPS
- [ ] 反向代理已配置（指向 `http://127.0.0.1:3000`）
- [ ] Nginx 配置已包含 WebSocket 支持
- [ ] PM2 服务正在运行（两个进程）
- [ ] 防火墙端口已开放（80, 443）
- [ ] 域名解析已配置（A 记录指向 `47.243.86.148`）
- [ ] 网站可以正常访问（HTTPS）
- [ ] 健康检查接口正常（`/api/health`）

---

## 下一步

配置完成后，你的网站应该可以通过 `https://www.linkloredu.com` 访问了！

如果遇到任何问题，可以：
1. 查看 PM2 日志：`pm2 logs`
2. 查看 Nginx 错误日志：宝塔面板 → 网站 → 设置 → 日志
3. 检查环境变量是否正确











