# 将项目复制到网站目录

## 当前情况

✅ 项目位置：`/root/linklore`（已确认存在）  
❌ `/www/wwwroot/linklore` 不存在  
📁 网站目录：`/www/wwwroot/wwwroot/www.linkloredu.com`（当前为空）

---

## 操作步骤

### 方法 1：复制项目（推荐，保留原项目作为备份）

在终端执行：

```bash
# 1. 进入网站目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 2. 复制项目文件（包括隐藏文件）
cp -r /root/linklore/* .
cp -r /root/linklore/.* . 2>/dev/null

# 3. 验证文件是否复制成功
ls -la
```

**说明**：
- `cp -r` = 递归复制
- `*` = 所有可见文件
- `.*` = 所有隐藏文件（如 `.git`, `.env` 等）
- `2>/dev/null` = 忽略错误（因为 `..` 和 `.` 无法复制，这是正常的）

### 方法 2：移动项目（不保留原项目）

```bash
# 1. 进入网站目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 2. 移动项目文件
mv /root/linklore/* .
mv /root/linklore/.* . 2>/dev/null

# 3. 删除空目录（可选）
rmdir /root/linklore
```

**注意**：移动会删除原项目，建议先用复制方法。

---

## 验证复制结果

复制完成后，在文件管理器中刷新，应该能看到：

**文件夹**：
- `apps/`
- `docs/`
- `infrastructure/`
- `packages/`
- `prisma/`
- `worker/`
- `.git/`（隐藏文件夹）

**文件**：
- `package.json`
- `README.md`
- `ecosystem.config.js`
- `pnpm-workspace.yaml`
- 等等

---

## 快速执行命令

直接复制粘贴以下命令：

```bash
cd /www/wwwroot/wwwroot/www.linkloredu.com && cp -r /root/linklore/* . && cp -r /root/linklore/.* . 2>/dev/null && ls -la
```

这个命令会：
1. 进入网站目录
2. 复制所有文件
3. 列出文件验证

---

## 复制完成后

### 1. 验证文件

在文件管理器中刷新，应该能看到项目文件。

### 2. 配置环境变量

1. 进入 `apps/web/` 目录
2. 创建或编辑 `.env.production` 文件
3. 添加配置：
   ```bash
   NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"
   ```

### 3. 运行部署脚本

```bash
cd /www/wwwroot/wwwroot/www.linkloredu.com
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh
```

---

## 如果复制失败

### 检查权限

```bash
# 检查网站目录权限
ls -ld /www/wwwroot/wwwroot/www.linkloredu.com

# 如果需要，修改权限
chown -R www:www /www/wwwroot/wwwroot/www.linkloredu.com
```

### 检查磁盘空间

```bash
df -h
```

---

## 重要提示

1. **保留原项目**：使用 `cp`（复制）而不是 `mv`（移动），这样原项目还在 `/root/linklore` 作为备份
2. **复制时间**：根据项目大小，可能需要几分钟
3. **验证文件**：复制后务必验证文件是否完整















