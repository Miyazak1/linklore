# 创建或查找网站目录

## 当前问题

路径 `/www/wwwroot/wwwroot/www.linkloredu.com` 不存在。

---

## 方法 1：在宝塔面板中查看网站根目录（最准确）

1. 登录宝塔面板
2. 进入 **网站** 菜单
3. 找到 `www.linkloredu.com`
4. 点击 **设置** → **网站目录**
5. **查看显示的根目录路径**

这个路径就是网站的实际目录。

---

## 方法 2：查找可能的目录位置

```bash
# 查找可能的目录
ls -la /www/wwwroot/ | grep linklore
ls -la /www/wwwroot/wwwroot/ 2>/dev/null

# 或者查找所有包含 linklore 的目录
find /www/wwwroot -name "*linklore*" -type d 2>/dev/null
```

---

## 方法 3：创建目录（如果不存在）

如果目录确实不存在，可以创建：

```bash
# 创建目录
mkdir -p /www/wwwroot/wwwroot/www.linkloredu.com

# 设置权限
chown -R www:www /www/wwwroot/wwwroot/www.linkloredu.com
chmod 755 /www/wwwroot/wwwroot/www.linkloredu.com

# 验证
ls -ld /www/wwwroot/wwwroot/www.linkloredu.com
```

---

## 方法 4：使用宝塔面板的标准路径

宝塔面板的默认网站目录通常是：
- `/www/wwwroot/域名`

所以可能是：
```bash
cd /www/wwwroot/www.linkloredu.com
```

---

## 推荐操作流程

### 步骤 1：在宝塔面板中查看网站根目录

1. 进入 **网站** → 找到 `www.linkloredu.com` → **设置** → **网站目录**
2. 记下显示的路径

### 步骤 2：根据实际路径操作

**如果路径是 `/www/wwwroot/www.linkloredu.com`**：

```bash
cd /www/wwwroot/www.linkloredu.com
git clone https://github.com/Miyazak1/linklore.git .
```

**如果路径是 `/www/wwwroot/wwwroot/www.linkloredu.com`**：

```bash
# 先创建目录
mkdir -p /www/wwwroot/wwwroot/www.linkloredu.com
cd /www/wwwroot/wwwroot/www.linkloredu.com
git clone https://github.com/Miyazak1/linklore.git .
```

**如果路径是其他**：

使用实际路径。

---

## 快速检查命令

执行以下命令，检查常见的目录位置：

```bash
echo "=== 检查常见位置 ===" && \
[ -d "/www/wwwroot/www.linkloredu.com" ] && echo "✅ 目录存在: /www/wwwroot/www.linkloredu.com" || echo "❌ /www/wwwroot/www.linkloredu.com 不存在" && \
[ -d "/www/wwwroot/wwwroot/www.linkloredu.com" ] && echo "✅ 目录存在: /www/wwwroot/wwwroot/www.linkloredu.com" || echo "❌ /www/wwwroot/wwwroot/www.linkloredu.com 不存在" && \
echo "" && \
echo "=== 查找包含 linklore 的目录 ===" && \
find /www/wwwroot -name "*linklore*" -type d 2>/dev/null
```

---

## 如果目录不存在，创建它

```bash
# 创建目录
mkdir -p /www/wwwroot/wwwroot/www.linkloredu.com

# 设置权限（宝塔面板通常使用 www 用户）
chown -R www:www /www/wwwroot/wwwroot/www.linkloredu.com

# 进入目录
cd /www/wwwroot/wwwroot/www.linkloredu.com

# 验证
pwd
```

---

## 重要提示

1. **最准确的方法**：在宝塔面板中查看网站根目录
2. **如果目录不存在**：需要创建它，或者修改网站根目录指向已存在的目录
3. **权限问题**：确保目录权限正确（通常是 `www:www`）

---

## 下一步

找到或创建目录后：

1. 进入目录
2. 克隆项目
3. 配置环境变量
4. 运行部署脚本















