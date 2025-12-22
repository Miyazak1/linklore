# 修复登录状态和更新密码

## 问题

1. **注册/登录后不进入登录状态** - 用户注册或登录成功后，前端没有正确刷新认证状态
2. **tsx 命令找不到** - 服务器上没有安装 tsx，无法运行 TypeScript 脚本

---

## 解决方案

### 一、修复登录状态问题

已修复注册页面，现在注册成功后会自动刷新认证状态。

**修改的文件**：
- `apps/web/app/(auth)/signup/page.tsx` - 添加了 `refreshAuth()` 调用

**测试步骤**：
1. 访问：`https://www.mooyu.fun/signup`
2. 填写注册表单并提交
3. **预期结果**：注册成功后自动进入登录状态，跳转到首页

---

### 二、更新管理员密码（无需 tsx）

#### 方案 1：使用 Node.js 脚本（推荐）

```bash
cd /www/wwwroot/linklore && \
echo "==========================================" && \
echo "更新管理员密码" && \
echo "==========================================" && \
echo "" && \
echo "账号信息：" && \
echo "  邮箱：495469022@qq.com" && \
echo "  新密码：Nuan2230543@" && \
echo "" && \
echo "正在更新..." && \
node scripts/update-admin-password.js && \
echo "" && \
echo "✓ 完成！现在可以使用新密码登录了！"
```

#### 方案 2：如果 Node.js 脚本也不行，使用临时脚本

```bash
cd /www/wwwroot/linklore

# 创建临时脚本
cat > update-password-temp.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updatePassword() {
  const email = '495469022@qq.com';
  const newPassword = 'Nuan2230543@';

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error('用户不存在');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword }
    });

    console.log('✓ 密码已更新');
    console.log('邮箱：', email);
    console.log('新密码：', newPassword);
  } catch (error) {
    console.error('✗ 更新失败：', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updatePassword();
EOF

# 运行脚本
node update-password-temp.js

# 清理
rm update-password-temp.js
```

---

### 三、检查环境变量（如果登录状态仍然有问题）

检查 `SESSION_SECRET` 是否配置：

```bash
cd /www/wwwroot/linklore

# 检查环境变量
cat apps/web/.env.production | grep SESSION_SECRET

# 如果没有，添加一个（生成随机字符串）
# 可以使用 openssl 生成：
openssl rand -base64 32
```

然后在 `apps/web/.env.production` 中添加：

```bash
SESSION_SECRET="生成的随机字符串"
```

重启服务：

```bash
pm2 restart linklore-web
```

---

## 验证

### 1. 测试注册功能

1. 访问：`https://www.mooyu.fun/signup`
2. 填写注册表单
3. 提交
4. **预期结果**：
   - 注册成功
   - 自动跳转到首页
   - 显示已登录状态（右上角显示用户信息）

### 2. 测试登录功能

1. 访问：`https://www.mooyu.fun/signin`
2. 使用以下信息登录：
   - 邮箱：`495469022@qq.com`
   - 密码：`Nuan2230543@`（如果已更新）
3. **预期结果**：
   - 登录成功
   - 自动跳转
   - 显示已登录状态

### 3. 检查认证状态

打开浏览器开发者工具（F12）：
- **Application** → **Cookies** → 应该看到 `ll_session` cookie
- **Console** → 不应该有认证相关的错误

---

## 如果仍然有问题

### 检查 Cookie 设置

如果使用 HTTPS，确保 cookie 的 `secure` 标志正确设置。检查 `apps/web/lib/auth/session.ts`：

```typescript
secure: process.env.NODE_ENV === 'production'
```

在生产环境应该是 `true`。

### 检查浏览器控制台

打开浏览器开发者工具（F12），查看：
- **Console** 标签 - 是否有错误
- **Network** 标签 - `/api/auth/me` 请求是否返回用户信息

### 清除浏览器缓存和 Cookie

1. 打开浏览器设置
2. 清除缓存和 Cookie
3. 重新访问网站并登录

---

**完成！现在注册和登录应该可以正常工作了！**

