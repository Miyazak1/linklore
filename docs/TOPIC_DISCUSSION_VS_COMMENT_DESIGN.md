# 话题讨论与评论系统设计

## 一、需求分析

### 1.1 核心概念区分

**讨论（Discussion）**：
- ✅ 正式参与主题讨论
- ✅ 需要上传文档（Document）
- ✅ 使用文档树结构（parentId, replies）
- ✅ 参与共识和分歧分析
- ✅ 需要点击"参与讨论"按钮，记录为讨论者身份
- ✅ 显示在文档树中

**评论（Comment）**：
- ✅ 非正式评论，围观者身份
- ✅ 不需要上传文档，直接输入文本
- ✅ 使用传统在线评论方式（扁平或简单嵌套，**不是文档树**）
- ✅ **不参与**共识和分歧分析
- ✅ 任何人都可以评论（登录用户）
- ✅ 显示在评论区域

### 1.2 关键区别

| 特性 | 讨论（Document） | 评论（Comment） |
|------|----------------|----------------|
| 形式 | 上传文档 | 直接输入文本 |
| 结构 | 文档树（parentId） | 扁平或嵌套（无深度限制，但需考虑显示方式） |
| 参与分析 | ✅ 参与共识/分歧分析 | ❌ 不参与 |
| 身份记录 | 讨论者（Document.authorId） | 评论者（Comment.authorId） |
| 操作 | 点击"参与讨论" | 直接"发表评论" |
| 显示位置 | 文档树区域 | 评论区域 |

## 二、数据模型设计

### 2.1 TopicComment 模型（新增）

```prisma
model TopicComment {
  id          String   @id @default(cuid())
  topicId     String
  topic       Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  
  // 简单嵌套（最多2-3层，不是文档树）
  parentId    String?  // 父评论ID，null表示顶级评论
  parent      TopicComment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: SetNull)
  replies     TopicComment[] @relation("CommentReplies")
  
  // 评论内容
  authorId    String
  author      User    @relation(fields: [authorId], references: [id])
  content     String  // Markdown格式的评论内容
  
  // 元数据
  depth       Int     @default(0) // 评论深度（用于显示，不做限制）
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime? // 软删除
  
  @@index([topicId])
  @@index([parentId])
  @@index([authorId])
  @@index([createdAt])
  @@index([topicId, parentId]) // 用于查询某个话题下的顶级评论
}
```

### 2.2 Topic 模型扩展

```prisma
model Topic {
  // ... 现有字段 ...
  
  // 新增关系
  comments    TopicComment[] // 评论列表（不参与分析）
  documents   Document[]     // 讨论文档列表（参与分析）
  
  // 可选：添加评论计数（用于性能优化）
  commentCount Int @default(0)
}
```

### 2.3 User 模型扩展

```prisma
model User {
  // ... 现有字段 ...
  
  // 新增关系
  topicComments TopicComment[] // 用户发表的评论
  
  // 现有关系保持不变
  documents     Document[]     // 用户上传的讨论文档
}
```

### 2.4 Document 模型（保持不变）

```prisma
model Document {
  // ... 现有字段保持不变 ...
  // 注意：Document 继续用于讨论，不用于评论
}
```

## 三、共识分析逻辑调整

### 3.1 用户对识别（保持不变）

- ✅ 只基于 `Document` 识别用户对
- ✅ 不考虑 `TopicComment`
- ✅ `identifyUserPairs` 函数保持不变

### 3.2 共识计算（保持不变）

- ✅ 只计算 `Document` 之间的共识和分歧
- ✅ `UserConsensus` 只包含 `Document` 相关的数据
- ✅ `ConsensusSnapshot` 只基于 `Document` 计算

## 四、API 设计

### 4.1 讨论相关 API（保持不变）

- ✅ `POST /api/uploads/initiate` - 上传文档（参与讨论）
- ✅ `POST /api/uploads/complete` - 完成上传
- ✅ `GET /api/topics/[id]/documents/tree` - 获取文档树
- ✅ 所有共识分析 API 保持不变

### 4.2 评论相关 API（新增）

**POST /api/topics/[id]/comments**
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
  - 内容长度限制（如 5000 字符）
  - 最大深度限制（如 3 层）
  - 频率限制（如每分钟最多 5 条）

**GET /api/topics/[id]/comments**
- 权限：无需登录
- 功能：获取话题的所有评论（扁平列表，前端构建嵌套）
- 查询参数：
  - `page`, `pageSize`: 分页（可选）
  - `sortBy`: 排序（createdAt, updatedAt）
- 返回：扁平列表，包含 `parentId` 和 `depth`

**PUT /api/topics/[id]/comments/[commentId]**
- 权限：需要登录，且必须是评论作者
- 功能：更新评论

**DELETE /api/topics/[id]/comments/[commentId]**
- 权限：需要登录，且必须是评论作者或话题作者
- 功能：软删除评论

## 五、前端 UI 设计

### 5.1 话题详情页布局调整

```
┌─────────────────────────────────────────┐
│  话题标题和基本信息                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  【参与讨论】按钮                        │
│  （上传文档，参与正式讨论）              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  文档树（讨论区域）                      │
│  - 显示所有讨论文档                      │
│  - 树状结构                              │
│  - 参与共识分析                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  共识分析面板（侧边栏）                  │
│  - 基于讨论文档的分析                    │
│  - 不包括评论                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  评论区域                                │
│  - 【发表评论】输入框                    │
│  - 评论列表（扁平或简单嵌套）            │
│  - 不参与共识分析                        │
└─────────────────────────────────────────┘
```

### 5.2 按钮和操作区分

**参与讨论**：
- 按钮文字："参与讨论" 或 "上传文档参与讨论"
- 操作：打开文档上传界面
- 结果：创建 Document，显示在文档树中
- 身份：记录为讨论者

**发表评论**：
- 按钮文字："发表评论" 或 "评论"
- 操作：打开评论输入框（Markdown编辑器）
- 结果：创建 TopicComment，显示在评论区域
- 身份：记录为评论者（围观者）

### 5.3 评论组件设计

**评论列表**：
- 支持无限深度嵌套（不做限制）
- 深度较深时采用折叠显示策略（默认显示前3-4层）
- 支持回复评论（创建子评论）
- 支持编辑/删除自己的评论
- 支持 Markdown 渲染
- 显示作者、时间、点赞数（可选）
- 视觉优化：超过5层后缩进不再增加，使用分隔符表示更深层级

**评论输入**：
- Markdown 编辑器
- 实时预览
- 字数限制提示
- 提交按钮

## 六、实现步骤

### 阶段 1：数据模型和迁移
1. ✅ 添加 `TopicComment` 模型到 schema
2. ✅ 扩展 `Topic` 和 `User` 模型
3. ✅ 运行数据库迁移
4. ✅ 更新 Prisma Client

### 阶段 2：后端 API
1. ✅ 创建 `/api/topics/[id]/comments` 端点（CRUD）
2. ✅ 实现评论深度计算（不做限制，仅用于显示）
3. ✅ 实现评论频率限制
4. ✅ 实现讨论者权限判断逻辑
5. ✅ 确保共识分析逻辑排除评论

### 阶段 3：前端实现
1. ✅ 调整话题详情页布局
2. ✅ 区分"参与讨论"和"发表评论"按钮
3. ✅ 实现评论组件（列表、输入、编辑、删除）
4. ✅ 实现评论深度显示优化（折叠、视觉优化）
5. ✅ 实现讨论者权限判断和条件显示
6. ✅ 确保文档树和评论区域分离显示
7. ✅ 共识面板对所有用户可见，分歧分析只对讨论者可见

### 阶段 4：测试和优化
1. ✅ 功能测试（讨论和评论分离）
2. ✅ 权限测试（讨论者 vs 非讨论者）
3. ✅ 共识分析测试（确保不包括评论）
4. ✅ 评论深度显示测试（折叠、展开）
5. ✅ 性能优化（评论计数、分页、懒加载）
6. ✅ UI/UX 优化

## 七、关键实现细节

### 7.1 评论深度计算（不做限制，仅用于显示）

```typescript
// 在创建评论时计算深度（不做限制）
async function createComment(topicId: string, content: string, parentId?: string) {
  let depth = 0;
  
  if (parentId) {
    const parent = await prisma.topicComment.findUnique({
      where: { id: parentId },
      select: { depth: true }
    });
    
    if (parent) {
      depth = parent.depth + 1;
    }
  }
  
  // 创建评论（不限制深度）
  const comment = await prisma.topicComment.create({
    data: {
      topicId,
      content,
      parentId: parentId || null,
      authorId: userId,
      depth
    }
  });
  
  return comment;
}
```

### 7.2 评论深度显示策略

当评论深度较深时，采用以下显示策略：

**方案 1：折叠显示（推荐）**
- 默认只显示前 3-4 层
- 超过深度的评论折叠，显示"展开更多回复"按钮
- 点击后展开该分支的所有评论

**方案 2：分页显示**
- 按深度分页，每页显示一定深度的评论
- 提供"查看更深层评论"按钮

**方案 3：视觉缩进限制**
- 超过一定深度（如 5 层）后，不再增加缩进
- 使用视觉分隔符（如"└─"）表示更深层级
- 保持可读性，避免过度缩进

### 7.3 共识分析排除评论

```typescript
// 在 identifyUserPairs 中确保只使用 Document
export async function identifyUserPairs(topicId: string): Promise<UserPair[]> {
  // 只查询 Document，不包括 Comment
  const docs = await prisma.document.findMany({
    where: { topicId },
    select: { id: true, parentId: true, authorId: true, createdAt: true }
  });
  
  // ... 后续逻辑保持不变
}
```

### 7.4 评论列表构建（前端）

```typescript
// 前端将扁平列表构建为嵌套结构
function buildCommentTree(comments: TopicComment[]): CommentTreeNode[] {
  const commentMap = new Map(comments.map(c => [c.id, { ...c, children: [] }]));
  const roots: CommentTreeNode[] = [];
  
  for (const comment of comments) {
    const node = commentMap.get(comment.id)!;
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }
  
  return roots;
}
```

## 八、讨论可见性与权限控制

### 8.1 讨论内容可见性

**所有用户（包括非讨论用户）**：
- ✅ 可以看到所有讨论文档（Document）
- ✅ 可以看到文档树结构
- ✅ 可以看到文档内容、摘要、评估等
- ✅ 可以看到右侧的共识分析面板（ConsensusPanel）

**分歧分析可见性**：
- ✅ **只有相关讨论者**可以看到与自己相关的分歧分析
- ❌ 非讨论用户看不到分歧分析功能（UserConsensusSelector）
- ❌ 非相关讨论者看不到其他用户对的分歧分析

### 8.2 权限判断逻辑

```typescript
// 判断用户是否是讨论者
async function isDiscussionParticipant(topicId: string, userId: string): Promise<boolean> {
  const docCount = await prisma.document.count({
    where: {
      topicId,
      authorId: userId
    }
  });
  return docCount > 0;
}

// 判断用户是否可以查看分歧分析
async function canViewDisagreement(
  topicId: string, 
  currentUserId: string, 
  targetUserId: string
): Promise<boolean> {
  // 必须是讨论者
  const isParticipant = await isDiscussionParticipant(topicId, currentUserId);
  if (!isParticipant) return false;
  
  // 必须与目标用户有直接讨论关系
  const userPair = await prisma.userConsensus.findFirst({
    where: {
      topicId,
      OR: [
        { userId1: currentUserId, userId2: targetUserId },
        { userId1: targetUserId, userId2: currentUserId }
      ]
    }
  });
  
  return !!userPair;
}
```

### 8.3 UI 显示逻辑

**话题详情页布局**：

```
┌─────────────────────────────────────────┐
│  话题标题和基本信息                      │
│  （所有人可见）                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  【参与讨论】按钮                        │
│  （所有人可见，但只有登录用户可操作）    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  文档树（讨论区域）                      │
│  - 显示所有讨论文档                      │
│  - 树状结构                              │
│  - **所有人可见**                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  共识分析面板（侧边栏）                  │
│  - 话题整体共识度                        │
│  - 共识趋势图                            │
│  - **所有人可见**                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  分歧和共识分析（条件显示）              │
│  - 只有讨论者可见                        │
│  - 只显示与自己相关的用户对              │
│  - 非讨论用户不显示此区域                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  评论区域                                │
│  - 【发表评论】输入框                    │
│  - 评论列表（无深度限制）                │
│  - 所有人可见                            │
└─────────────────────────────────────────┘
```

### 8.4 API 权限调整

**GET /api/topics/[id]/consensus/users**
- 权限：无需登录（但需要判断是否是讨论者）
- 返回：所有讨论用户列表
- 如果当前用户不是讨论者，不返回用户对信息

**GET /api/topics/[id]/consensus/users/[targetUserId]**
- 权限：需要登录，且必须是讨论者
- 功能：获取当前用户与目标用户的分歧和共识
- 如果当前用户不是讨论者，返回 403
- 如果当前用户与目标用户没有直接讨论关系，返回 404

**GET /api/topics/[id]/consensus**
- 权限：无需登录
- 功能：获取话题整体共识分析（所有人可见）
- 返回：共识度、分歧度、趋势图数据

### 9.1 性能考虑
- 评论计数：使用 `commentCount` 字段，避免实时计算
- 评论加载：支持分页或懒加载
- 嵌套构建：前端构建，后端返回扁平列表

### 9.2 安全考虑
- 评论内容：XSS 防护（Markdown 转义）
- 评论频率：限制每个用户每分钟评论次数
- 深度限制：防止评论嵌套过深（最大3层）

### 9.3 用户体验
- 评论通知：话题作者可以收到评论通知（可选）
- 评论排序：默认按时间排序，支持按热度排序
- 评论编辑：支持 Markdown 格式，实时预览

### 9.4 评论深度显示优化

当评论深度较深时，建议采用以下策略：

1. **折叠显示**（推荐）：
   - 默认显示前 3-4 层
   - 超过深度的评论折叠
   - 显示"展开更多回复 (N 条)"按钮
   - 点击后展开该分支的所有评论

2. **视觉优化**：
   - 超过 5 层后，缩进不再增加
   - 使用视觉分隔符（如"└─"）表示更深层级
   - 保持可读性，避免过度缩进

3. **性能优化**：
   - 深度评论使用懒加载
   - 只渲染可见区域的评论
   - 使用虚拟滚动（如果评论数量很大）

## 十、迁移策略

### 10.1 现有数据
- ✅ 现有的 `Document` 系统保持不变
- ✅ 现有的共识分析逻辑保持不变
- ✅ 新增 `TopicComment` 模型，不影响现有功能

### 10.2 向后兼容
- ✅ 保持所有现有的 API 端点
- ✅ 保持所有现有的前端组件
- ✅ 新增评论功能，不影响讨论功能

## 十一、总结

这个设计清晰地分离了"讨论"和"评论"两个概念：

1. **讨论（Document）**：正式、严肃、参与分析
2. **评论（Comment）**：非正式、轻松、不参与分析

关键点：
- ✅ 讨论使用文档树，评论使用简单嵌套
- ✅ 共识分析只计算讨论，不包括评论
- ✅ UI 上明确区分两种参与方式
- ✅ 向后兼容，不影响现有功能

