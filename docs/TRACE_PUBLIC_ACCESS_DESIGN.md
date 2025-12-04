# 语义溯源公开访问与评论系统设计

## 一、需求评估

### 1.1 核心需求
- ✅ **公开可见**：所有用户（包括未登录）都可以查看已发布的语义溯源
- ✅ **公开评论**：所有登录用户都可以对已发布的溯源进行评论（树状结构）
- ✅ **编辑权限**：只有作者（editor）可以编辑自己创建的溯源
- ✅ **作者后台**：作者可以在自己的面板后台查看和管理自己创建的所有溯源

### 1.2 可行性分析
- ✅ **技术可行**：参考现有的 Topic/Document 树状回复结构
- ✅ **数据模型**：需要新增 `TraceComment` 模型
- ✅ **权限控制**：需要调整 API 权限逻辑
- ✅ **UI 调整**：需要区分公开列表页和作者后台页

## 二、数据模型设计

### 2.1 TraceComment 模型（新增）

```prisma
model TraceComment {
  id          String   @id @default(cuid())
  traceId     String
  trace       Trace   @relation(fields: [traceId], references: [id], onDelete: Cascade)
  
  // 树状结构
  parentId    String?  // 父评论ID，null表示顶级评论
  parent      TraceComment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: SetNull)
  replies     TraceComment[] @relation("CommentReplies")
  
  // 评论内容
  authorId    String
  author      User    @relation(fields: [authorId], references: [id])
  content     String  // Markdown格式的评论内容
  
  // 元数据
  depth       Int     @default(0) // 评论深度（用于限制最大深度）
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime? // 软删除（保留评论但标记为已删除）
  
  @@index([traceId])
  @@index([parentId])
  @@index([authorId])
  @@index([createdAt])
  @@index([traceId, parentId]) // 用于查询某个溯源下的顶级评论
}
```

### 2.2 Trace 模型扩展

```prisma
model Trace {
  // ... 现有字段 ...
  
  // 新增关系
  comments    TraceComment[] // 评论列表
  
  // 可选：添加评论计数（用于性能优化）
  commentCount Int @default(0)
}
```

### 2.3 User 模型扩展

```prisma
model User {
  // ... 现有字段 ...
  
  // 新增关系
  traceComments TraceComment[] // 用户发表的评论
}
```

## 三、API 设计

### 3.1 公开溯源列表 API

**GET /api/traces/public**
- 权限：无需登录
- 功能：获取所有已发布的溯源（PUBLISHED 和 APPROVED）
- 查询参数：
  - `page`, `pageSize`: 分页
  - `search`: 搜索标题/目标
  - `type`: 类型筛选
  - `sortBy`: 排序字段（createdAt, publishedAt, credibilityScore）
- 返回：不包含 `editorId`，只返回公开信息

### 3.2 溯源详情 API（公开）

**GET /api/traces/[id]**
- 权限：无需登录（仅限 PUBLISHED 和 APPROVED 状态）
- 功能：获取溯源详情，包括评论列表
- 返回：包含 `comments` 关系（树状结构）

### 3.3 作者后台溯源列表 API

**GET /api/traces/my**
- 权限：需要登录，且必须是 editor 或 admin
- 功能：获取当前用户创建的所有溯源（包括 DRAFT）
- 查询参数：同 `/api/traces/public`
- 返回：包含所有状态，包含 `editorId`

### 3.4 评论 API

**POST /api/traces/[id]/comments**
- 权限：需要登录
- 功能：创建评论
- 请求体：
  ```json
  {
    "content": "评论内容（Markdown）",
    "parentId": "父评论ID（可选，用于回复）"
  }
  ```
- 限制：
  - 只能对 PUBLISHED 或 APPROVED 状态的溯源评论
  - 最大深度限制（如 5 层）
  - 内容长度限制（如 5000 字符）

**GET /api/traces/[id]/comments**
- 权限：无需登录
- 功能：获取溯源的所有评论（树状结构）
- 查询参数：
  - `page`, `pageSize`: 分页（可选，默认返回所有）
  - `sortBy`: 排序（createdAt, updatedAt）

**PUT /api/traces/[id]/comments/[commentId]**
- 权限：需要登录，且必须是评论作者
- 功能：更新评论

**DELETE /api/traces/[id]/comments/[commentId]**
- 权限：需要登录，且必须是评论作者或溯源作者
- 功能：软删除评论

## 四、权限控制

### 4.1 查看权限

| 操作 | 未登录 | 普通用户 | 编辑/管理员 |
|------|--------|----------|------------|
| 查看已发布溯源 | ✅ | ✅ | ✅ |
| 查看草稿溯源 | ❌ | ❌ | ✅（仅自己的） |
| 查看所有溯源 | ❌ | ❌ | ✅（管理员） |

### 4.2 评论权限

| 操作 | 未登录 | 普通用户 | 编辑/管理员 |
|------|--------|----------|------------|
| 评论已发布溯源 | ❌ | ✅ | ✅ |
| 编辑自己的评论 | ❌ | ✅ | ✅ |
| 删除自己的评论 | ❌ | ✅ | ✅ |
| 删除他人评论 | ❌ | ❌ | ✅（仅溯源作者） |

### 4.3 编辑权限

| 操作 | 未登录 | 普通用户 | 编辑/管理员 |
|------|--------|----------|------------|
| 创建溯源 | ❌ | ❌ | ✅ |
| 编辑自己的溯源 | ❌ | ❌ | ✅ |
| 编辑他人溯源 | ❌ | ❌ | ✅（仅管理员） |

## 五、前端页面调整

### 5.1 公开溯源列表页

**路径**: `/traces`（现有路径，需要调整）
- 显示所有已发布的溯源
- 支持搜索、筛选、排序
- 每个溯源显示：标题、类型、可信度评分、发布时间、评论数
- 点击进入详情页

### 5.2 溯源详情页（公开）

**路径**: `/traces/[id]`（现有路径，需要调整）
- 显示溯源完整内容（正文、引用、AI分析）
- 显示评论区域（树状结构）
- 登录用户可以发表评论
- 作者可以看到"编辑"按钮

### 5.3 作者后台页（新增）

**路径**: `/traces/my` 或 `/my/traces`
- 显示当前用户创建的所有溯源（包括草稿）
- 支持按状态筛选（草稿、已发布、已采纳）
- 显示统计信息（总数、各状态数量）
- 快速操作：编辑、发布、删除

### 5.4 导航调整

- 公开列表：导航栏的"语义溯源"链接到 `/traces`（公开列表）
- 作者后台：在"我的"下拉菜单中添加"我的溯源"链接

## 六、实现步骤

### 阶段 1：数据模型和迁移
1. 添加 `TraceComment` 模型到 schema
2. 扩展 `Trace` 和 `User` 模型
3. 运行数据库迁移
4. 更新 Prisma Client

### 阶段 2：API 实现
1. 创建 `/api/traces/public` 端点（公开列表）
2. 修改 `/api/traces/[id]` 端点（支持公开访问）
3. 创建 `/api/traces/my` 端点（作者后台）
4. 创建 `/api/traces/[id]/comments` 端点（评论 CRUD）
5. 调整权限检查逻辑

### 阶段 3：前端实现
1. 调整 `/traces` 页面为公开列表
2. 调整 `/traces/[id]` 页面支持评论
3. 创建 `/traces/my` 或 `/my/traces` 页面（作者后台）
4. 实现评论组件（树状显示、发表、编辑、删除）
5. 调整导航菜单

### 阶段 4：测试和优化
1. 权限测试（各种角色、各种状态）
2. 评论功能测试（树状结构、深度限制）
3. 性能优化（评论计数、分页、缓存）
4. UI/UX 优化

## 七、注意事项

### 7.1 性能考虑
- 评论计数：使用 `commentCount` 字段，避免实时计算
- 评论加载：支持分页或懒加载
- 树状结构：前端构建树，后端返回扁平列表

### 7.2 安全考虑
- 评论内容：XSS 防护（Markdown 转义）
- 评论频率：限制每个用户每分钟评论次数
- 深度限制：防止评论树过深（如最大 5 层）

### 7.3 用户体验
- 评论通知：作者可以收到评论通知（可选）
- 评论排序：默认按时间排序，支持按热度排序
- 评论编辑：支持 Markdown 格式，实时预览

## 八、迁移策略

### 8.1 现有数据
- 现有的 `/api/traces` 端点保留，但改为作者后台专用
- 现有的 `/traces` 页面改为公开列表
- 现有的编辑功能保持不变

### 8.2 向后兼容
- 保持现有的 API 端点，新增公开端点
- 保持现有的权限检查逻辑，新增公开访问逻辑

