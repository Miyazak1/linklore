# 每日百科题目更新脚本

## 功能说明

这些脚本用于从维基百科自动获取并更新每日百科游戏的题目。

## 脚本说明

### 1. `update-daily-baike.ts`
手动更新题目的脚本。

**使用方法：**
```bash
# 更新今天的题目
pnpm baike:update

# 更新指定日期的题目
pnpm baike:update 20251220
```

### 2. `schedule-baike-update.ts`
定时任务脚本，每天9点（北京时间）自动更新题目。

**使用方法：**
```bash
# 启动定时任务
pnpm baike:schedule

# 立即执行一次并启动定时任务
RUN_IMMEDIATELY=true pnpm baike:schedule
```

**定时配置：**
- 默认：每天UTC 1:00（北京时间9:00）
- 可通过环境变量 `BAIKE_UPDATE_CRON` 自定义
- Cron格式：`分钟 小时 日 月 星期`

## API接口

### POST /api/games/baike/update
手动触发更新题目的API接口。

**请求示例：**
```bash
# 更新今天的题目
curl -X POST http://localhost:3000/api/games/baike/update

# 更新指定日期的题目
curl -X POST "http://localhost:3000/api/games/baike/update?date=20251220"
```

## 部署方式

### 方式1：使用PM2（推荐）

在 `ecosystem.config.js` 中添加定时任务进程：

```javascript
{
  name: 'linklore-baike-scheduler',
  script: 'pnpm',
  args: '--filter @linklore/web baike:schedule',
  cwd: process.cwd(),
  instances: 1,
  exec_mode: 'fork',
  env: {
    NODE_ENV: 'production'
  },
  error_file: './logs/baike-scheduler-error.log',
  out_file: './logs/baike-scheduler-out.log',
  autorestart: true
}
```

### 方式2：使用systemd（Linux）

创建 `/etc/systemd/system/linklore-baike-scheduler.service`：

```ini
[Unit]
Description=LinkLore Baike Daily Update Scheduler
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/linklore
ExecStart=/usr/bin/pnpm --filter @linklore/web baike:schedule
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 方式3：使用外部Cron服务

使用cron-job.org或其他服务，每天9点调用：
```
POST https://your-domain.com/api/games/baike/update
```

### 方式4：使用Vercel Cron（如果部署在Vercel）

在 `vercel.json` 中添加：

```json
{
  "crons": [{
    "path": "/api/games/baike/update",
    "schedule": "0 1 * * *"
  }]
}
```

## 注意事项

1. **时区设置**：定时任务使用UTC时区，默认在UTC 1:00执行（北京时间9:00）
2. **重试机制**：如果获取维基百科内容失败，会自动重试最多5次
3. **题目验证**：只有符合要求的标题才会被使用（长度5-50字符，不包含特殊字符）
4. **幂等性**：如果当日题目已存在，不会重复创建

## 故障排查

如果题目更新失败，检查：
1. 网络连接（能否访问维基百科API）
2. 数据库连接
3. 查看日志文件





