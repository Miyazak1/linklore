# 共识和分歧分析改进方案

## 问题分析

### 1. 共识度显示0%的问题

**现状**：
- 共识度从 `latestSnapshot.consensusScore` 读取
- 如果快照不存在或 `consensusScore` 为 null，会显示0%
- 快照可能没有正确创建，或者计算逻辑有问题

**可能原因**：
1. `trackConsensus` 函数没有被调用
2. 快照创建时 `consensusScore` 为 null
3. 前端显示逻辑有问题（检查 null 但显示为0%）

**解决方案**：
- 检查快照是否正确创建
- 确保 `consensusScore` 正确保存（不能为 null）
- 前端显示时正确处理 null 值

### 2. 刷新页面重新分析的问题

**现状**：
- GET `/api/topics/[id]/consensus` 每次都会调用 AI 分析
- 没有检查是否有新文档
- 没有使用已有快照

**解决方案**：
- 检查最新快照时间
- 检查是否有新文档（比较文档数量或最后更新时间）
- 如果有新文档才重新分析，否则使用已有快照

### 3. 个人化的分歧和共识分析

**需求**：
- 每个用户只能看到与自己相关的分歧和共识
- 基于回复树形结构
- 只有参与讨论的用户才能看到相关分析

**示例场景**：
```
话题A（用户A发布）
  └─ 回复1（用户B回复A）
      └─ 回复2（用户C回复B）
  └─ 回复3（用户D回复A）
```

- 用户B应该看到：
  - 与A的分歧和共识
  - 与C的分歧和共识（如果C回复了B）
- 用户C应该看到：
  - 与B的分歧和共识
  - 与A的分歧和共识（通过B的路径）
- 用户D应该看到：
  - 与A的分歧和共识
  - 看不到B和C的分析（没有直接交互）

**数据模型设计**：

```prisma
model UserConsensus {
  id            String   @id @default(cuid())
  topicId       String
  userId        String   // 查看者用户ID
  targetUserId  String   // 目标用户ID（与谁的分歧/共识）
  doc1Id        String   // 用户1的文档ID
  doc2Id        String   // 用户2的文档ID
  consensus     Json     // 共识点列表
  disagreements Json     // 分歧点列表
  consensusScore Float?   // 两人之间的共识度
  divergenceScore Float? // 两人之间的分歧度
  branchPath    String[] // 回复路径
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([topicId, userId])
  @@index([doc1Id, doc2Id])
}
```

**API设计**：
- `GET /api/topics/[id]/consensus/personal?userId=xxx` - 获取个人化的共识和分歧
- 返回该用户与所有参与讨论的用户之间的分歧和共识

### 4. 话题级别的整体分析

**需求**：
- 话题级别的共识度和分歧度量化
- 趋势展示（时间序列）
- 关键共识点和主要分歧点

**现状**：
- 已有 `ConsensusSnapshot` 模型
- 已有趋势展示组件
- 需要改进量化算法和展示

**改进方向**：
- 基于所有文档对计算整体共识度
- 考虑文档权重（质量、深度等）
- 时间序列趋势分析

## 实现优先级

1. **高优先级**：
   - 修复共识度显示0%的问题
   - 实现缓存机制（刷新不重新分析）

2. **中优先级**：
   - 实现个人化的分歧和共识分析
   - 改进话题级别的量化展示

3. **低优先级**：
   - 优化算法性能
   - 添加更多可视化

## 技术实现要点

### 1. 修复共识度显示问题

```typescript
// 检查快照是否存在且有效
const latestSnapshot = await prisma.consensusSnapshot.findFirst({
  where: { topicId: id },
  orderBy: { snapshotAt: 'desc' }
});

// 如果快照不存在或consensusScore为null，触发创建
if (!latestSnapshot || latestSnapshot.consensusScore === null) {
  await trackConsensus(id);
}
```

### 2. 实现缓存机制

```typescript
// 检查是否有新文档
const lastDoc = await prisma.document.findFirst({
  where: { topicId: id },
  orderBy: { createdAt: 'desc' },
  select: { createdAt: true }
});

// 如果最新文档时间晚于快照时间，重新分析
if (!latestSnapshot || 
    (lastDoc && lastDoc.createdAt > latestSnapshot.snapshotAt)) {
  // 重新分析
} else {
  // 使用已有快照
}
```

### 3. 个人化分析逻辑

```typescript
// 获取用户参与的所有讨论路径
function getUserDiscussionPaths(userId: string, topicId: string) {
  // 1. 找到用户的所有文档
  // 2. 对于每个文档，找到回复它的文档（子节点）
  // 3. 找到该文档回复的文档（父节点）
  // 4. 构建讨论路径
  // 5. 只分析与路径上其他用户的分歧和共识
}
```

### 4. 话题级别量化

```typescript
// 计算话题级别的共识度
function calculateTopicConsensus(topicId: string) {
  // 1. 获取所有文档对
  // 2. 计算每对文档的共识度
  // 3. 加权平均（考虑文档质量、深度等）
  // 4. 返回整体共识度
}
```

## 数据库迁移

需要添加 `UserConsensus` 模型：

```prisma
model UserConsensus {
  id            String   @id @default(cuid())
  topicId       String
  userId        String
  targetUserId  String
  doc1Id        String
  doc2Id        String
  consensus     Json
  disagreements Json
  consensusScore Float?
  divergenceScore Float?
  branchPath    String[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([topicId, userId])
  @@index([doc1Id, doc2Id])
  @@unique([topicId, userId, targetUserId, doc1Id, doc2Id])
}
```



