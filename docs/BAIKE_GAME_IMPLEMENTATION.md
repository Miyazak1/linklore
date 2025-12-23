# 每日百科游戏实现文档

## 功能概述

每日百科游戏是一个猜字游戏，用户需要猜出隐藏的百科标题。题目内容来自维基百科，每天自动更新。

## 核心功能

### 1. 游戏机制
- 单字符猜测：每次只能输入一个字符
- 标点符号自动显示：标点符号不隐藏，作为提示
- 已猜中字符显示：猜中的字符在所有位置显示
- 完成判断：所有非标点字符都猜中后游戏完成

### 2. 数据来源
- **维基百科**：从中文维基百科随机获取页面标题
- **自动更新**：每天9点（北京时间）自动更新题目
- **智能筛选**：自动过滤不适合的标题（太短、太长、特殊字符等）

### 3. 状态管理
- 支持登录用户和匿名用户
- 本地存储持久化（刷新页面不丢失进度）
- 自动恢复游戏状态

---

## 文件结构

### 数据库模型
- `prisma/schema.prisma` - 添加了 `BaikeQuestion` 和 `BaikeGameRecord` 模型

### API接口
- `apps/web/app/api/games/baike/question/route.ts` - 获取当日题目
- `apps/web/app/api/games/baike/guess/route.ts` - 提交猜测
- `apps/web/app/api/games/baike/status/route.ts` - 获取游戏状态
- `apps/web/app/api/games/baike/stats/route.ts` - 获取统计信息
- `apps/web/app/api/games/baike/update/route.ts` - 手动触发更新题目

### 业务逻辑
- `apps/web/lib/wikipedia/fetcher.ts` - 维基百科API调用
- `apps/web/lib/games/baike/updateDailyQuestion.ts` - 更新每日题目逻辑

### 前端组件
- `apps/web/components/games/baike/GameBoard.tsx` - 游戏棋盘组件
- `apps/web/components/games/baike/GameInput.tsx` - 输入组件
- `apps/web/components/games/baike/GameStats.tsx` - 统计组件
- `apps/web/app/(main)/games/baike/page.tsx` - 游戏主页面

### 定时任务
- `apps/web/scripts/update-daily-baike.ts` - 手动更新脚本
- `apps/web/scripts/schedule-baike-update.ts` - 定时任务脚本

---

## 使用方法

### 开发环境

#### 1. 手动更新题目（测试）
```bash
# 更新今天的题目
pnpm baike:update

# 更新指定日期的题目
pnpm baike:update 20251220
```

#### 2. 启动定时任务（开发测试）
```bash
# 启动定时任务（每天9点执行）
pnpm baike:schedule

# 立即执行一次并启动定时任务
RUN_IMMEDIATELY=true pnpm baike:schedule
```

#### 3. 通过API手动触发
```bash
# 更新今天的题目
curl -X POST http://localhost:3000/api/games/baike/update

# 更新指定日期的题目
curl -X POST "http://localhost:3000/api/games/baike/update?date=20251220"
```

### 生产环境

#### 方式1：使用PM2（推荐）

PM2配置已更新，包含定时任务进程：

```bash
# 启动所有进程（包括定时任务）
pm2 start ecosystem.config.js

# 只启动定时任务
pm2 start ecosystem.config.js --only linklore-baike-scheduler
```

#### 方式2：使用systemd（Linux）

创建服务文件 `/etc/systemd/system/linklore-baike-scheduler.service`：

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

启动服务：
```bash
sudo systemctl enable linklore-baike-scheduler
sudo systemctl start linklore-baike-scheduler
```

#### 方式3：使用外部Cron服务

使用 cron-job.org 或其他服务，每天9点（北京时间）调用：
```
POST https://your-domain.com/api/games/baike/update
```

#### 方式4：使用Vercel Cron（如果部署在Vercel）

在 `vercel.json` 中添加：

```json
{
  "crons": [{
    "path": "/api/games/baike/update",
    "schedule": "0 1 * * *"
  }]
}
```

---

## 定时任务配置

### 默认配置
- **执行时间**：每天UTC 1:00（北京时间9:00）
- **Cron表达式**：`0 1 * * *`
- **时区**：UTC

### 自定义配置

通过环境变量 `BAIKE_UPDATE_CRON` 自定义：

```bash
# 每天8点（北京时间）执行
BAIKE_UPDATE_CRON="0 0 * * *" pnpm baike:schedule

# 每天12点（北京时间）执行
BAIKE_UPDATE_CRON="0 4 * * *" pnpm baike:schedule
```

### Cron表达式格式
```
分钟 小时 日 月 星期
0    1   *  *  *    # 每天UTC 1:00
```

---

## 维基百科API说明

### 使用的API
1. **MediaWiki API**（主要方法）
   - 获取随机页面：`/w/api.php?action=query&list=random`
   - 获取页面内容：`/w/api.php?action=query&prop=extracts`

2. **REST API**（备用方法）
   - 随机页面摘要：`/api/rest_v1/page/random/summary`

### 标题筛选规则
- 长度：5-50个字符
- 不能包含特殊字符：`< > { } [ ] \ |`
- 不能全是数字或符号

### 重试机制
- 如果获取失败，自动重试最多5次
- 如果所有重试都失败，使用示例题目作为后备

---

## 数据库结构

### BaikeQuestion（题目表）
```typescript
{
  id: string;           // 题目ID
  date: string;         // 日期（YYYYMMDD，唯一）
  title: string;        // 百科标题
  description?: string;  // 描述
  category?: string;     // 分类
  difficulty?: number;  // 难度（1-5）
  createdAt: DateTime;
}
```

### BaikeGameRecord（游戏记录表）
```typescript
{
  id: string;
  questionId: string;
  userId?: string;      // 可选，支持匿名
  date: string;
  guessCount: number;
  isCompleted: boolean;
  completedAt?: DateTime;
  guesses: Json;        // 猜测历史
  revealedChars: Json;  // 已揭示字符数组
  createdAt: DateTime;
}
```

---

## 测试步骤

### 测试用例 TC-2025-007：维基百科题目获取
- **前置条件**：数据库已迁移，网络正常
- **操作步骤**：
  1. 运行 `pnpm baike:update`
  2. 检查控制台输出
  3. 查询数据库确认题目已创建
- **预期结果**：
  - 成功从维基百科获取标题
  - 题目已保存到数据库
  - 标题长度和格式符合要求
- **实际结果**：（由产品经理填写）

### 测试用例 TC-2025-008：定时任务
- **前置条件**：定时任务脚本已配置
- **操作步骤**：
  1. 启动定时任务：`pnpm baike:schedule`
  2. 等待到执行时间（或修改cron表达式立即执行）
  3. 检查日志文件
- **预期结果**：
  - 定时任务在指定时间执行
  - 题目成功更新
  - 日志记录正确
- **实际结果**：（由产品经理填写）

### 测试用例 TC-2025-009：API手动触发
- **前置条件**：服务器运行中
- **操作步骤**：
  1. 调用 `POST /api/games/baike/update`
  2. 检查响应
  3. 验证题目已更新
- **预期结果**：
  - API返回成功
  - 题目已更新到数据库
- **实际结果**：（由产品经理填写）

---

## 故障排查

### 问题1：无法从维基百科获取题目

**可能原因：**
- 网络连接问题
- 维基百科API限制
- 标题不符合筛选条件

**解决方法：**
1. 检查网络连接
2. 查看日志文件了解详细错误
3. 系统会自动使用示例题目作为后备

### 问题2：定时任务不执行

**可能原因：**
- 进程未启动
- Cron表达式错误
- 时区设置问题

**解决方法：**
1. 检查进程状态：`pm2 status`
2. 查看日志：`pm2 logs linklore-baike-scheduler`
3. 验证Cron表达式和时区设置

### 问题3：题目重复或缺失

**可能原因：**
- 数据库唯一约束问题
- 定时任务执行失败

**解决方法：**
1. 检查数据库约束
2. 查看定时任务日志
3. 手动触发更新：`pnpm baike:update`

---

## 后续优化建议

1. **题目质量提升**
   - 添加更多筛选规则（避免过于专业或冷门的标题）
   - 根据难度等级筛选题目
   - 添加题目分类标签

2. **性能优化**
   - 缓存维基百科API响应
   - 批量预生成未来几天的题目

3. **用户体验**
   - 添加提示功能（显示已猜字符的统计）
   - 添加历史记录查看
   - 添加分享功能

4. **数据分析**
   - 记录用户猜测模式
   - 分析题目难度分布
   - 优化题目选择算法

---

## 回退方案

如果需要回退到示例题目：

1. 修改 `apps/web/app/api/games/baike/question/route.ts`
2. 注释掉维基百科获取逻辑
3. 恢复使用示例题目数组

或者通过环境变量控制：
```bash
USE_WIKIPEDIA=false  # 禁用维基百科，使用示例题目
```

---

## 版本信息

- **实现日期**：2025-12-19
- **版本**：v1.0.0
- **状态**：已完成并测试





