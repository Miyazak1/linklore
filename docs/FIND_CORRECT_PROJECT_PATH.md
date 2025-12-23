# 查找正确的项目路径

## 当前问题

路径 `/www/wwwroot/wwwroot/www.linkloredu.com` 不存在。

需要找到项目的实际位置。

---

## 第一步：查找项目位置

### 方法 1：查找 linklore 目录

```bash
# 查找所有 linklore 目录
find /www/wwwroot -name "linklore" -type d 2>/dev/null
find /root -name "linklore" -type d 2>/dev/null
```

### 方法 2：查找 package.json 文件

```bash
# 查找 package.json（项目根目录的标志）
find /www/wwwroot -name "package.json" -type f 2>/dev/null | grep linklore
find /root -name "package.json" -type f 2>/dev/null | grep linklore
```

### 方法 3：查找 apps 目录

```bash
# 查找 apps 目录（项目结构的一部分）
find /www/wwwroot -name "apps" -type d 2>/dev/null | grep linklore
find /root -name "apps" -type d 2>/dev/null | grep linklore
```

---

## 第二步：检查常见位置

```bash
# 检查常见位置
ls -la /root/linklore 2>/dev/null && echo "项目在 /root/linklore"
ls -la /www/wwwroot/linklore 2>/dev/null && echo "项目在 /www/wwwroot/linklore"
ls -la /www/wwwroot/www.linkloredu.com 2>/dev/null && echo "项目在 /www/wwwroot/www.linkloredu.com"
ls -la /www/wwwroot/wwwroot/www.linkloredu.com 2>/dev/null && echo "项目在 /www/wwwroot/wwwroot/www.linkloredu.com"
```

---

## 第三步：检查宝塔面板网站配置

在宝塔面板中：

1. 进入 **网站** 菜单
2. 找到 `www.linkloredu.com`
3. 点击 **设置** → **网站目录**
4. 查看显示的根目录路径

这个路径就是项目的实际位置。

---

## 第四步：根据找到的路径操作

### 如果项目在 `/root/linklore`

需要复制到网站目录，或者修改网站根目录。

**选项 A：复制到网站目录**

```bash
# 先找到网站目录（在宝塔面板中查看）
# 假设网站目录是 /www/wwwroot/www.linkloredu.com
cd /www/wwwroot/www.linkloredu.com
cp -r /root/linklore/* .
cp -r /root/linklore/.* . 2>/dev/null
```

**选项 B：修改网站根目录**

在宝塔面板中：
1. 网站设置 → **网站目录**
2. 修改为：`/root/linklore`
3. 保存

### 如果项目在其他位置

使用找到的实际路径。

---

## 快速查找命令

执行以下命令，快速找到项目：

```bash
# 查找项目
echo "=== 查找 linklore 目录 ==="
find /www/wwwroot -name "linklore" -type d 2>/dev/null
find /root -name "linklore" -type d 2>/dev/null

echo ""
echo "=== 查找 package.json ==="
find /www/wwwroot -name "package.json" -path "*/linklore/*" 2>/dev/null
find /root -name "package.json" -path "*/linklore/*" 2>/dev/null

echo ""
echo "=== 检查常见位置 ==="
[ -d "/root/linklore" ] && echo "✅ 项目在 /root/linklore" || echo "❌ /root/linklore 不存在"
[ -d "/www/wwwroot/linklore" ] && echo "✅ 项目在 /www/wwwroot/linklore" || echo "❌ /www/wwwroot/linklore 不存在"
[ -d "/www/wwwroot/www.linkloredu.com" ] && echo "✅ 项目在 /www/wwwroot/www.linkloredu.com" || echo "❌ /www/wwwroot/www.linkloredu.com 不存在"
```

---

## 找到路径后的操作

找到正确的项目路径后：

1. **进入项目目录**
2. **检查环境变量文件**
3. **运行部署脚本**

例如，如果项目在 `/root/linklore`：

```bash
cd /root/linklore
cat apps/web/.env.production
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh
```

---

## 重要提示

1. **在宝塔面板中查看网站根目录**：这是最准确的方法
2. **项目可能还在 `/root/linklore`**：需要复制到网站目录或修改网站根目录
3. **确保路径正确**：错误的路径会导致所有操作失败















