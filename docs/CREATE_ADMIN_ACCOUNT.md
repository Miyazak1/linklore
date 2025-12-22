# 创建默认管理员账号

**目标**：创建管理员账号并修复 avatarUrl 字段  
**账号信息**：
- 邮箱：`495469022@qq.com`
- 密码：`Nuan2230543@`
- 角色：`admin`

---

## 一、修复 avatarUrl 字段

### 步骤 1：添加 avatarUrl 字段到数据库

在宝塔面板终端执行：

```bash
cd /www/wwwroot/linklore

# 执行 SQL 添加字段
pnpm prisma db execute --file prisma/migrations/manual_add_user_avatar.sql --schema prisma/schema.prisma
```

或者直接在数据库管理工具中执行：

```sql
-- 添加 avatarUrl 字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'avatarUrl'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
    END IF;
END $$;
```

### 步骤 2：重新生成 Prisma Client

```bash
cd /www/wwwroot/linklore

# 重新生成 Prisma Client
pnpm prisma:generate
```

---

## 二、创建管理员账号

### 方式 1：使用脚本（推荐）

```bash
cd /www/wwwroot/linklore

# 运行创建管理员脚本
pnpm tsx scripts/create-admin.ts
```

### 方式 2：手动创建（如果脚本失败）

在数据库管理工具中执行：

```sql
-- 先检查用户是否存在
SELECT * FROM "User" WHERE email = '495469022@qq.com';

-- 如果不存在，创建用户
-- 注意：需要先安装 bcryptjs 生成密码哈希
```

或者使用 Node.js 脚本：

```bash
cd /www/wwwroot/linklore

# 创建临时脚本
cat > create-admin-temp.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = '495469022@qq.com';
  const password = 'Nuan2230543@';
  const name = '管理员';
  const role = 'admin';

  try {
    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // 更新为管理员
      console.log('用户已存在，更新为管理员...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash: hashedPassword,
          role: role,
          name: name
        }
      });
      console.log('✓ 用户已更新为管理员');
    } else {
      // 创建新用户
      console.log('创建管理员账号...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name: name,
          role: role
        }
      });
      console.log('✓ 管理员账号创建成功');
    }

    // 验证
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        email: true,
       name: true,
        role: true
      }
    });

    console.log('\n管理员账号信息：');
    console.log('  邮箱：', user.email);
    console.log('  姓名：', user.name);
    console.log('  角色：', user.role);
    console.log('  密码：', password);
    console.log('\n✓ 完成！');
  } catch (error) {
    console.error('✗ 创建管理员失败：', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
EOF

# 运行脚本
node create-admin-temp.js

# 清理临时文件
rm create-admin-temp.js
```

---

## 三、一键执行（完整流程）

```bash
cd /www/wwwroot/linklore && \
echo "==========================================" && \
echo "修复 avatarUrl 字段并创建管理员账号" && \
echo "==========================================" && \
echo "" && \
echo "[1/4] 添加 avatarUrl 字段..." && \
pnpm prisma db execute --file prisma/migrations/manual_add_user_avatar.sql --schema prisma/schema.prisma && \
echo "✓ 字段已添加" && \
echo "" && \
echo "[2/4] 重新生成 Prisma Client..." && \
pnpm prisma:generate && \
echo "✓ Prisma Client 已生成" && \
echo "" && \
echo "[3/4] 创建管理员账号..." && \
pnpm tsx scripts/create-admin.ts && \
echo "" && \
echo "[4/4] 重启服务..." && \
pm2 restart linklore-web && \
echo "✓ 服务已重启" && \
echo "" && \
echo "==========================================" && \
echo "完成！" && \
echo "==========================================" && \
echo "" && \
echo "管理员账号信息：" && \
echo "  邮箱：495469022@qq.com" && \
echo "  密码：Nuan2230543@" && \
echo "  角色：admin" && \
echo "" && \
echo "现在可以使用这个账号登录了！"
```

---

## 四、验证

### 1. 验证字段已添加

```bash
cd /www/wwwroot/linklore

# 检查字段是否存在
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'avatarUrl';"
```

应该返回：`avatarUrl`

### 2. 验证管理员账号

```bash
cd /www/wwwroot/linklore

# 使用 Prisma Studio 查看（如果有）
# 或者直接查询数据库
psql $DATABASE_URL -c "SELECT email, name, role FROM \"User\" WHERE email = '495469022@qq.com';"
```

应该看到：
- email: `495469022@qq.com`
- name: `管理员`
- role: `admin`

### 3. 测试登录

1. 访问：`https://www.mooyu.fun/signin`
2. 使用以下信息登录：
   - 邮箱：`495469022@qq.com`
   - 密码：`Nuan2230543@`
3. 应该成功登录并看到管理员界面

---

## 五、如果遇到问题

### 问题 1：bcryptjs 未安装

```bash
cd /www/wwwroot/linklore

# 安装 bcryptjs
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

### 问题 2：tsx 命令找不到

```bash
cd /www/wwwroot/linklore

# 安装 tsx
pnpm add -D tsx

# 或者使用 node 运行编译后的文件
pnpm build
node dist/scripts/create-admin.js
```

### 问题 3：SQL 执行失败

直接在数据库管理工具中执行：

```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
```

---

**完成！现在可以使用管理员账号登录了！**

