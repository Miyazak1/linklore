# SMTP 邮件服务配置详细指南

## 一、选择邮件服务商

### 推荐服务商对比

| 服务商 | 优点 | 缺点 | 适用场景 |
|--------|------|------|----------|
| **QQ邮箱** | 免费、稳定、国内访问快 | 需要授权码 | 个人项目、小规模应用 |
| **163邮箱** | 免费、稳定 | 需要授权码 | 个人项目 |
| **Gmail** | 国际通用、稳定 | 需要应用专用密码、可能被墙 | 国际项目 |
| **阿里云企业邮箱** | 专业、稳定、高发送量 | 需要付费 | 企业项目、生产环境 |
| **SendGrid** | 专业邮件服务、高送达率 | 需要付费 | 生产环境、大规模应用 |

### 选择建议

- **个人项目/测试环境**：推荐 QQ 邮箱或 163 邮箱（免费、配置简单）
- **生产环境/企业项目**：推荐阿里云企业邮箱或 SendGrid（稳定、专业）

---

## 二、QQ 邮箱配置步骤（推荐）

### 步骤 1：登录 QQ 邮箱

1. 访问 https://mail.qq.com
2. 使用 QQ 账号登录

### 步骤 2：开启 SMTP 服务

1. 点击邮箱页面右上角的 **"设置"**
2. 选择 **"账户"** 标签页
3. 向下滚动找到 **"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"** 部分
4. 找到 **"POP3/SMTP服务"** 或 **"IMAP/SMTP服务"**
5. 点击 **"开启"** 按钮

### 步骤 3：生成授权码

1. 开启服务后，系统会要求你发送短信验证
2. 按照提示发送短信到指定号码
3. 验证成功后，会显示一个 **16位授权码**（例如：`abcdefghijklmnop`）
4. **重要**：立即复制并保存这个授权码，页面关闭后无法再次查看
5. 如果忘记授权码，需要重新生成

### 步骤 4：记录配置信息

你需要记录以下信息：

```
SMTP_HOST="smtp.qq.com"
SMTP_PORT=587
SMTP_USER="你的QQ邮箱地址"  # 例如：123456789@qq.com
SMTP_PASSWORD="你的授权码"  # 刚才生成的16位授权码
SMTP_SECURE="false"
SMTP_FROM="LinkLore <你的QQ邮箱地址>"
```

---

## 三、163 邮箱配置步骤

### 步骤 1：登录 163 邮箱

1. 访问 https://mail.163.com
2. 使用 163 账号登录

### 步骤 2：开启 SMTP 服务

1. 点击邮箱页面右上角的 **"设置"**
2. 选择 **"POP3/SMTP/IMAP"** 标签页
3. 找到 **"POP3/SMTP服务"** 或 **"IMAP/SMTP服务"**
4. 点击 **"开启"** 按钮

### 步骤 3：生成授权码

1. 开启服务后，系统会要求你发送短信验证
2. 按照提示发送短信到指定号码（通常是发送到 1069 开头的号码）
3. 验证成功后，会显示一个 **授权码**（通常是16位字符）
4. **重要**：立即复制并保存这个授权码

### 步骤 4：记录配置信息

```
SMTP_HOST="smtp.163.com"
SMTP_PORT=465
SMTP_USER="你的163邮箱地址"  # 例如：yourname@163.com
SMTP_PASSWORD="你的授权码"  # 刚才生成的授权码
SMTP_SECURE="true"  # 注意：163邮箱使用465端口，需要SSL
SMTP_FROM="LinkLore <你的163邮箱地址>"
```

---

## 四、Gmail 配置步骤

### 步骤 1：登录 Google 账户

1. 访问 https://gmail.com
2. 使用 Google 账号登录

### 步骤 2：开启两步验证

1. 访问 https://myaccount.google.com/security
2. 找到 **"登录 Google"** 部分
3. 点击 **"两步验证"**
4. 按照提示开启两步验证（这是使用应用专用密码的前提）

### 步骤 3：生成应用专用密码

1. 在 **"两步验证"** 页面，找到 **"应用专用密码"**
2. 点击 **"应用专用密码"**
3. 选择应用类型：**"邮件"**
4. 选择设备：**"其他（自定义名称）"**，输入 "LinkLore"
5. 点击 **"生成"**
6. 系统会显示一个 **16位应用专用密码**（格式：`xxxx xxxx xxxx xxxx`）
7. **重要**：立即复制并保存这个密码（去掉空格，只保留16位字符）

### 步骤 4：记录配置信息

```
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="你的Gmail地址"  # 例如：yourname@gmail.com
SMTP_PASSWORD="你的应用专用密码"  # 刚才生成的16位密码（去掉空格）
SMTP_SECURE="false"
SMTP_FROM="LinkLore <你的Gmail地址>"
```

---

## 五、阿里云企业邮箱配置步骤

### 步骤 1：购买并配置企业邮箱

1. 访问 https://www.aliyun.com/product/mail
2. 购买企业邮箱服务
3. 按照提示配置域名和邮箱账号

### 步骤 2：获取 SMTP 配置信息

1. 登录阿里云企业邮箱管理后台
2. 进入 **"邮箱设置"** → **"客户端设置"**
3. 查看 SMTP 服务器地址（通常是 `smtp.mxhichina.com` 或 `smtp.qiye.aliyun.com`）
4. 记录端口号（通常是 465 或 587）

### 步骤 3：记录配置信息

```
SMTP_HOST="smtp.mxhichina.com"  # 或 smtp.qiye.aliyun.com
SMTP_PORT=465
SMTP_USER="你的企业邮箱地址"  # 例如：noreply@yourdomain.com
SMTP_PASSWORD="你的企业邮箱密码"  # 企业邮箱的登录密码
SMTP_SECURE="true"  # 465端口使用SSL
SMTP_FROM="LinkLore <你的企业邮箱地址>"
```

---

## 六、配置到服务器

### 步骤 1：编辑 .env.local 文件

在服务器上执行：

```bash
cd /www/wwwroot/www.mooyu.fun
nano apps/web/.env.local
```

### 步骤 2：添加 SMTP 配置

在文件末尾添加（根据你选择的服务商，使用对应的配置）：

```bash
# SMTP 邮件服务配置
SMTP_HOST="smtp.qq.com"
SMTP_PORT=587
SMTP_USER="your_email@qq.com"
SMTP_PASSWORD="your_auth_code"
SMTP_SECURE="false"
SMTP_FROM="LinkLore <your_email@qq.com>"
```

**注意**：
- 将 `your_email@qq.com` 替换为你的实际邮箱地址
- 将 `your_auth_code` 替换为你的实际授权码/密码
- 如果使用其他服务商，修改 `SMTP_HOST`、`SMTP_PORT`、`SMTP_SECURE` 等参数

### 步骤 3：保存并退出

- 按 `Ctrl + O` 保存
- 按 `Enter` 确认
- 按 `Ctrl + X` 退出

### 步骤 4：更新 ecosystem.config.js

```bash
# 重新生成 ecosystem.config.js（包含新的 SMTP 配置）
cat > /tmp/create_ecosystem.js << 'EOFCREATE'
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'apps/web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let value = match[2].trim();
      value = value.replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  }
});

envVars.NODE_ENV = 'production';
envVars.HOSTNAME = '0.0.0.0';
envVars.PORT = '3000';

const envString = Object.entries(envVars)
  .map(([key, value]) => `      '${key}': '${value.replace(/'/g, "\\'")}'`)
  .join(',\n');

const config = `module.exports = {
  apps: [{
    name: 'linklore-web',
    script: 'apps/web/.next/standalone/apps/web/server.js',
    cwd: '/www/wwwroot/www.mooyu.fun',
    env: {
${envString}
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    instances: 1,
    exec_mode: 'fork'
  }]
};
`;

fs.writeFileSync(path.join(__dirname, 'ecosystem.config.js'), config);
console.log('✓ ecosystem.config.js 更新成功');
EOFCREATE

node /tmp/create_ecosystem.js
```

### 步骤 5：重启 PM2 进程

```bash
pm2 restart linklore-web

# 等待启动
sleep 3

# 查看日志，确认 SMTP 配置已加载（不应该再看到 SMTP 配置不完整的警告）
pm2 logs linklore-web --lines 20 | grep -i "smtp\|email"
```

---

## 七、测试邮件发送功能

### 方法 1：通过注册功能测试

1. 访问你的网站
2. 点击注册按钮
3. 输入邮箱地址（使用你配置的邮箱）
4. 提交注册
5. 检查邮箱是否收到验证邮件

### 方法 2：查看服务器日志

```bash
# 查看邮件发送相关的日志
pm2 logs linklore-web --lines 50 | grep -i "email\|smtp\|mail"

# 应该看到类似这样的成功日志：
# [EmailSender] 邮件发送成功 { to: 'xxx@xxx.com', messageId: '...' }
```

### 方法 3：检查错误日志

```bash
# 如果配置有问题，会看到错误日志
pm2 logs linklore-web --err --lines 50 | grep -i "email\|smtp"

# 常见错误：
# - "SMTP配置不完整" → 检查环境变量是否正确设置
# - "Authentication failed" → 检查用户名和密码是否正确
# - "Connection timeout" → 检查 SMTP_HOST 和 SMTP_PORT 是否正确
```

---

## 八、常见问题排查

### 问题 1：仍然看到 "SMTP配置不完整" 警告

**原因**：环境变量未正确加载到 PM2 进程

**解决方法**：
1. 确认 `.env.local` 文件中有 SMTP 配置
2. 重新生成 `ecosystem.config.js`
3. 重启 PM2 进程
4. 验证：`pm2 env linklore-web | grep SMTP`

### 问题 2：邮件发送失败，提示 "Authentication failed"

**原因**：用户名或密码错误

**解决方法**：
1. 检查 `SMTP_USER` 是否正确（完整的邮箱地址）
2. 检查 `SMTP_PASSWORD` 是否正确（授权码，不是邮箱登录密码）
3. 对于 QQ/163 邮箱，确保使用的是授权码，不是登录密码
4. 对于 Gmail，确保使用的是应用专用密码，不是账户密码

### 问题 3：邮件发送失败，提示 "Connection timeout"

**原因**：SMTP 服务器地址或端口错误

**解决方法**：
1. 检查 `SMTP_HOST` 是否正确
2. 检查 `SMTP_PORT` 是否正确
3. 检查服务器防火墙是否允许访问该端口
4. 尝试使用不同的端口（587 或 465）

### 问题 4：邮件发送成功但收不到邮件

**原因**：邮件可能被放入垃圾箱

**解决方法**：
1. 检查垃圾邮件文件夹
2. 将发件人添加到联系人
3. 检查 `SMTP_FROM` 配置是否正确
4. 考虑使用企业邮箱提高送达率

---

## 九、安全建议

1. **不要使用普通密码**：必须使用授权码或应用专用密码
2. **妥善保管授权码**：不要泄露给他人
3. **定期更换授权码**：建议每3-6个月更换一次
4. **使用环境变量**：不要将配置硬编码到代码中
5. **生产环境建议**：使用企业邮箱或专业邮件服务（如 SendGrid）

---

## 十、快速配置脚本（QQ邮箱示例）

如果你使用 QQ 邮箱，可以直接执行以下脚本（替换为你的实际信息）：

```bash
cd /www/wwwroot/www.mooyu.fun

# 添加 SMTP 配置（替换为你的实际信息）
cat >> apps/web/.env.local << 'EOF'

# SMTP 邮件服务配置（QQ邮箱）
SMTP_HOST="smtp.qq.com"
SMTP_PORT=587
SMTP_USER="你的QQ邮箱@qq.com"
SMTP_PASSWORD="你的授权码"
SMTP_SECURE="false"
SMTP_FROM="LinkLore <你的QQ邮箱@qq.com>"
EOF

# 重新生成 ecosystem.config.js
node /tmp/create_ecosystem.js

# 重启进程
pm2 restart linklore-web

# 验证配置
sleep 3
pm2 logs linklore-web --lines 10 | grep -i "smtp"
```

---

## 总结

1. **选择服务商**：个人项目推荐 QQ 邮箱或 163 邮箱
2. **获取授权码**：在邮箱设置中开启 SMTP 服务并生成授权码
3. **配置环境变量**：在 `.env.local` 中添加 SMTP 配置
4. **更新 PM2 配置**：重新生成 `ecosystem.config.js`
5. **重启服务**：重启 PM2 进程使配置生效
6. **测试功能**：通过注册功能测试邮件发送

完成以上步骤后，SMTP 配置就完成了！


