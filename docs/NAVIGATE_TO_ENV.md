# 导航到环境变量文件

## 当前位置

你现在在：`/www/wwwroot/wwwroot`

看到有一个文件夹：`www.linkloredu.com`

这很可能就是你的项目目录！

---

## 操作步骤

### 1. 进入项目目录

点击 `www.linkloredu.com` 文件夹，进入该目录。

### 2. 查找环境变量文件

进入 `www.linkloredu.com` 后，应该能看到项目结构：
- `apps/` 文件夹
- `worker/` 文件夹
- `prisma/` 文件夹
- 等等

### 3. 进入 apps/web 目录

1. 点击 `apps` 文件夹
2. 进入 `apps` 后，点击 `web` 文件夹
3. 进入 `web` 后，查找 `.env.production` 文件

完整路径应该是：
`/www/wwwroot/wwwroot/www.linkloredu.com/apps/web/.env.production`

---

## 如果文件不存在

如果 `apps/web/` 目录下没有 `.env.production` 文件：

1. 在 `web` 目录中，点击 **新建** 按钮
2. 选择 **文件**
3. 文件名输入：`.env.production`
4. 点击 **创建**
5. 然后点击文件名进行编辑

---

## 编辑环境变量文件

1. 找到 `.env.production` 文件后，点击文件名
2. 在右侧编辑器中，添加或修改以下内容：

```bash
NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"
```

3. 如果文件已有其他配置，确保这一行存在且正确
4. 点击 **保存**

---

## 验证

保存后，可以验证文件内容是否正确：
- 再次点击 `.env.production` 文件
- 查看内容中是否包含 `NEXT_PUBLIC_APP_URL="https://www.linkloredu.com"`

---

## 下一步

配置好环境变量后，继续执行部署脚本：

```bash
cd /www/wwwroot/wwwroot/www.linkloredu.com
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh
```











