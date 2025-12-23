# 删除旧项目并添加新网站

## 当前情况

看到有一个项目：
- **网站名**：`47.243.86.148`（IP地址）
- **根目录**：`/www/wwwroot/47.243.86.148_9000`
- **状态**：运行中
- **SSL证书**：未部署

这不是我们的 LinkLore 项目，可以删除。

---

## 操作步骤

### 第一步：删除旧项目

1. 在网站列表中，找到 `47.243.86.148` 这一行
2. 点击右侧 **操作** 列中的 **删除** 按钮
3. 确认删除（可能会提示是否删除网站目录，可以选择不删除目录，只删除网站配置）

**注意**：删除网站配置不会删除文件，只是删除网站配置。

---

### 第二步：添加新网站

1. 点击绿色的 **添加站点** 按钮
2. 填写信息：

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

**PHP 版本**：
- 选择 **纯静态**（不需要 PHP）

**其他选项**：
- 保持默认

3. 点击 **提交**

---

### 第三步：配置反向代理

1. 在网站列表中，找到刚添加的 `www.linkloredu.com`
2. 点击 **设置** 按钮
3. 进入 **反向代理** 标签
4. 点击 **添加反向代理**
5. 配置：
   - **代理名称**：`linklore`
   - **目标 URL**：`http://127.0.0.1:3000`
   - **发送域名**：`$host`
6. 点击 **保存**

---

### 第四步：修改 Nginx 配置

1. 在网站设置中，进入 **配置文件** 标签
2. 找到 `location /` 块，确保包含：

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

### 第五步：申请 SSL 证书

1. 在网站设置中，进入 **SSL** 标签
2. 选择 **Let's Encrypt**
3. 勾选两个域名：
   - `linkloredu.com`
   - `www.linkloredu.com`
4. 点击 **申请**
5. 等待完成（通常 1-2 分钟）
6. 申请成功后，勾选 **强制 HTTPS**
7. 点击 **保存**

---

## 快速操作流程

1. ✅ 删除旧项目（`47.243.86.148`）
2. ✅ 添加新网站（`www.linkloredu.com`）
3. ✅ 配置反向代理
4. ✅ 申请 SSL 证书
5. ✅ 启动 PM2 服务

---

## 重要提示

1. **删除网站配置不会删除文件**：只是删除网站配置，不会删除 `/www/wwwroot/47.243.86.148_9000` 目录中的文件
2. **确保项目文件在正确位置**：我们的项目在 `/www/wwwroot/wwwroot/www.linkloredu.com`
3. **域名解析**：确保在域名服务商已添加 A 记录指向 `47.243.86.148`

---

## 完成后的验证

添加网站后，应该能看到：
- 网站名：`www.linkloredu.com`
- 根目录：`/www/wwwroot/wwwroot/www.linkloredu.com`
- 状态：运行中
- SSL证书：已部署（申请后）

---

## 如果删除时提示

如果删除时提示是否删除网站目录：
- **选择"否"**：只删除网站配置，保留文件
- 或者选择"是"：删除配置和目录（如果确定不需要）

因为我们不需要 `/www/wwwroot/47.243.86.148_9000` 这个目录，可以选择删除。















