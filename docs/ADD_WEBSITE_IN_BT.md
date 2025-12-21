# 在宝塔面板重新添加网站

## 当前情况

网站列表为空，需要重新添加网站。

---

## 第一步：添加网站

### 1.1 点击添加站点

在宝塔面板的 **网站** 页面：

1. 点击绿色的 **添加站点** 按钮（或 **添加HTML项目**）
2. 会弹出添加网站的对话框

### 1.2 填写网站信息

在对话框中填写：

**域名**：
```
linkloredu.com
www.linkloredu.com
```
（两个域名都填，用换行或逗号分隔）

**根目录**：
```
/www/wwwroot/wwwroot/www.linkloredu.com
```
（或你的实际项目路径）

**PHP 版本**：
- 选择 **纯静态**（不需要 PHP）

**其他选项**：
- 保持默认即可

### 1.3 提交

点击 **提交** 按钮

---

## 第二步：配置反向代理

### 2.1 进入网站设置

1. 在网站列表中，找到刚添加的 `www.linkloredu.com`
2. 点击域名右侧的 **设置** 按钮

### 2.2 配置反向代理

1. 进入 **反向代理** 标签
2. 点击 **添加反向代理**
3. 填写配置：
   - **代理名称**：`linklore`
   - **目标 URL**：`http://127.0.0.1:3000`
   - **发送域名**：`$host`
   - **其他选项**：保持默认
4. 点击 **保存**

### 2.3 修改 Nginx 配置（确保 WebSocket 支持）

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

## 第三步：申请 SSL 证书

### 3.1 申请证书

1. 在网站设置中，进入 **SSL** 标签
2. 选择 **Let's Encrypt**（免费证书）
3. 勾选两个域名：
   - `linkloredu.com`
   - `www.linkloredu.com`
4. 点击 **申请**
5. 等待申请完成（通常 1-2 分钟）

### 3.2 开启强制 HTTPS

1. 申请成功后，勾选 **强制 HTTPS**
2. 点击 **保存**

---

## 第四步：验证配置

### 4.1 检查网站状态

在网站列表中，应该能看到：
- 网站名称：`www.linkloredu.com`
- 根目录：`/www/wwwroot/wwwroot/www.linkloredu.com`
- SSL 证书：已配置（绿色标记）

### 4.2 访问网站

在浏览器中访问：
- `https://www.linkloredu.com`
- `https://linkloredu.com`（应该自动跳转到 www）

---

## 如果遇到问题

### 问题 1：域名解析未生效

**检查方法**：
```bash
ping www.linkloredu.com
```

**解决**：
- 在域名服务商（阿里云）添加 A 记录：
  - `@` → `47.243.86.148`
  - `www` → `47.243.86.148`
- 等待 DNS 生效（5-30 分钟）

### 问题 2：SSL 证书申请失败

**原因**：
- 域名解析未生效
- 80 端口未开放

**解决**：
1. 检查域名解析
2. 确保 80 端口已开放（宝塔面板 → 安全）
3. 等待 DNS 生效后重试

### 问题 3：访问网站显示 502 Bad Gateway

**原因**：Next.js 应用没有运行

**解决**：
```bash
# 检查 PM2 状态
pm2 status

# 如果没运行，启动服务
cd /www/wwwroot/wwwroot/www.linkloredu.com
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## 完成检查清单

- [ ] 网站已添加（域名：`linkloredu.com` 和 `www.linkloredu.com`）
- [ ] 根目录已配置为 `/www/wwwroot/wwwroot/www.linkloredu.com`
- [ ] 反向代理已配置（目标：`http://127.0.0.1:3000`）
- [ ] Nginx 配置已包含 WebSocket 支持
- [ ] SSL 证书已申请
- [ ] 强制 HTTPS 已开启
- [ ] 网站可以正常访问（HTTPS）
- [ ] PM2 服务正在运行

---

## 下一步

网站配置完成后，确保：
1. 环境变量已配置（`NEXT_PUBLIC_APP_URL`）
2. 部署脚本已运行
3. PM2 服务已启动

然后就可以访问 `https://www.linkloredu.com` 了！











