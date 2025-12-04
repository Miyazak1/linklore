# 基于用户对的共识和分歧分析设计

## 核心理念

**以用户对（User Pair）为分析单位，而不是以文档为单位**

- 每个用户对（userId1, userId2）代表两个用户之间的讨论关系
- 话题级别的共识度 = 所有用户对共识度的综合计算
- 用户通过点击其他用户名查看与该用户的分歧和共识

## 数据模型设计

### 1. UserConsensus 模型（用户对共识）

```prisma
model UserConsensus {
  id              String   @id @default(cuid())
  topicId         String
  userId1         String   // 用户1 ID（较小的ID，用于去重）
  userId2         String   // 用户2 ID（较大的ID，用于去重）
  user1           User     @relation("User1Consensus", fields: [userId1], references: [id])
  user2           User     @relation("User2Consensus", fields: [userId2], references: [id])
  topic           Topic    @relation(fields: [topicId], references: [id])
  
  // 共识和分歧数据
  consensus       Json     // 共识点列表：[{text, docIds, supportCount}]
  disagreements   Json     // 分歧点列表：[{claim1, claim2, doc1Id, doc2Id, description}]
  
  // 量化指标
  consensusScore  Float?   // 用户对之间的共识度（0-1）
  divergenceScore Float?   // 用户对之间的分歧度（0-1）
  
  // 元数据
  docIds          String[] // 涉及的所有文档ID
  discussionPaths Json     // 讨论路径：[{path: [docId1, docId2, ...], depth: number}]
  lastAnalyzedAt  DateTime? // 最后分析时间
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([topicId, userId1, userId2])
  @@index([topicId])
  @@index([userId1])
  @@index([userId2])
  @@index([topicId, userId1])
  @@index([topicId, userId2])
}
```

### 2. 用户关系识别逻辑（优化版）

```typescript
/**
 * 识别话题中所有参与讨论的用户对
 * 基于文档树结构，找出有直接讨论关系的用户对
 * 
 * 规则：
 * 1. 直接回复关系：A回复B → A和B形成用户对
 * 2. 多轮讨论：A和B多次互相回复 → 合并为同一个用户对，记录所有讨论路径
 * 3. 不包含间接关系：A回复B，C回复A → 只识别A-B和A-C，不识别B-C（除非B直接回复C）
 */
async function identifyUserPairs(topicId: string): Promise<Array<{
  userId1: string;
  userId2: string;
  docIds: string[];
  discussionPaths: Array<{path: string[], depth: number, direction: 'user1->user2' | 'user2->user1'}>;
}>> {
  // 1. 获取所有文档（包含作者信息）
  const docs = await prisma.document.findMany({
    where: { topicId },
    select: {
      id: true,
      parentId: true,
      authorId: true
    }
  });
  
  // 2. 构建文档映射
  const docMap = new Map(docs.map(d => [d.id, d]));
  
  // 3. 识别用户对（基于直接回复关系）
  const userPairs = new Map<string, {
    userId1: string;
    userId2: string;
    docIds: Set<string>;
    discussionPaths: Array<{path: string[], depth: number, direction: 'user1->user2' | 'user2->user1'}>;
  }>();
  
  docs.forEach(doc => {
    // 只处理有父节点的文档（回复文档）
    if (doc.parentId) {
      const parent = docMap.get(doc.parentId);
      if (parent && parent.authorId !== doc.authorId) {
        // 两个不同用户之间的回复关系
        const [userId1, userId2] = doc.authorId < parent.authorId
          ? [doc.authorId, parent.authorId]
          : [parent.authorId, doc.authorId];
        
        const pairKey = `${userId1}:${userId2}`;
        
        if (!userPairs.has(pairKey)) {
          userPairs.set(pairKey, {
            userId1,
            userId2,
            docIds: new Set(),
            discussionPaths: []
          });
        }
        
        const pair = userPairs.get(pairKey)!;
        pair.docIds.add(doc.id);
        pair.docIds.add(parent.id);
        
        // 确定讨论方向
        const direction = doc.authorId === userId1 ? 'user1->user2' : 'user2->user1';
        
        // 计算深度（从根节点到当前节点的深度）
        let depth = 0;
        let currentId: string | null = doc.id;
        while (currentId) {
          const currentDoc = docMap.get(currentId);
          if (!currentDoc || !currentDoc.parentId) break;
          depth++;
          currentId = currentDoc.parentId;
        }
        
        pair.discussionPaths.push({
          path: [parent.id, doc.id],
          depth,
          direction
        });
      }
    }
  });
  
  return Array.from(userPairs.values()).map(pair => ({
    userId1: pair.userId1,
    userId2: pair.userId2,
    docIds: Array.from(pair.docIds),
    discussionPaths: pair.discussionPaths
  }));
}

function getPairKey(userId1: string, userId2: string): string {
  return userId1 < userId2 ? `${userId1}:${userId2}` : `${userId2}:${userId1}`;
}
```

## API 设计

### 1. 获取话题中参与讨论的用户列表

```typescript
GET /api/topics/[id]/consensus/users

// 响应
{
  users: Array<{
    userId: string;
    email: string;
    name?: string;
    documentCount: number; // 该用户在该话题中的文档数
    discussionCount: number; // 该用户参与讨论的次数
  }>;
  currentUserId?: string; // 当前登录用户ID
}
```

### 2. 获取当前用户与目标用户的分歧和共识

```typescript
GET /api/topics/[id]/consensus/users/[targetUserId]?currentUserId=xxx

// 响应
{
  user1: {
    userId: string;
    email: string;
    name?: string;
  };
  user2: {
    userId: string;
    email: string;
    name?: string;
  };
  consensus: Array<{
    text: string;
    supportCount: number;
    docIds: string[];
  }>;
  disagreements: Array<{
    claim1: string;
    claim2: string;
    doc1Id: string;
    doc2Id: string;
    description?: string;
  }>;
  consensusScore: number; // 0-1
  divergenceScore: number; // 0-1
  discussionPaths: Array<{
    path: string[];
    depth: number;
  }>;
  lastAnalyzedAt: string;
}
```

### 3. 获取话题级别的整体共识度

```typescript
GET /api/topics/[id]/consensus/overview

// 响应
{
  consensusScore: number; // 话题级别共识度（所有用户对的加权平均）
  divergenceScore: number; // 话题级别分歧度
  userPairCount: number; // 用户对数量
  analyzedPairs: number; // 已分析的用户对数量
  trend: 'converging' | 'diverging' | 'stable';
  keyConsensusPoints: string[]; // 关键共识点（跨多个用户对）
  keyDisagreementPoints: string[]; // 主要分歧点
  userPairs: Array<{
    userId1: string;
    userId2: string;
    consensusScore: number;
    divergenceScore: number;
  }>;
  snapshots: Array<{
    snapshotAt: string;
    consensusScore: number;
    divergenceScore: number;
  }>;
}
```

## 计算逻辑

### 1. 用户对之间的共识度计算

```typescript
/**
 * 计算两个用户之间的共识度
 * 基于他们所有相关文档的观点
 */
async function calculateUserPairConsensus(
  topicId: string,
  userId1: string,
  userId2: string
): Promise<{
  consensusScore: number;
  divergenceScore: number;
  consensus: Array<{text: string, supportCount: number, docIds: string[]}>;
  disagreements: Array<{claim1: string, claim2: string, doc1Id: string, doc2Id: string}>;
}> {
  // 1. 获取两个用户在该话题中的所有文档
  const user1Docs = await prisma.document.findMany({
    where: { topicId, authorId: userId1 },
    include: { summaries: { orderBy: { id: 'desc' }, take: 1 } }
  });
  
  const user2Docs = await prisma.document.findMany({
    where: { topicId, authorId: userId2 },
    include: { summaries: { orderBy: { id: 'desc' }, take: 1 } }
  });
  
  // 2. 提取所有观点
  const user1Claims: Array<{claim: string, docId: string}> = [];
  user1Docs.forEach(doc => {
    const summary = doc.summaries[0];
    if (summary && Array.isArray(summary.claims)) {
      summary.claims.forEach((claim: string) => {
        if (typeof claim === 'string') {
          user1Claims.push({ claim, docId: doc.id });
        }
      });
    }
  });
  
  const user2Claims: Array<{claim: string, docId: string}> = [];
  user2Docs.forEach(doc => {
    const summary = doc.summaries[0];
    if (summary && Array.isArray(summary.claims)) {
      summary.claims.forEach((claim: string) => {
        if (typeof claim === 'string') {
          user2Claims.push({ claim, docId: doc.id });
        }
      });
    }
  });
  
  // 3. 使用AI分析共识和分歧
  const prompt = `分析以下两个用户在该话题中的观点：

用户1的观点：
${user1Claims.map(c => `- ${c.claim}`).join('\n')}

用户2的观点：
${user2Claims.map(c => `- ${c.claim}`).join('\n')}

请识别：
1. 共识点：两个用户都支持或表达相似的观点
2. 分歧点：两个用户观点冲突或对立的地方

返回JSON格式：
{
  "consensus": [
    {"text": "共识观点", "supportCount": 2, "docIds": ["doc1", "doc2"]}
  ],
  "disagreements": [
    {"claim1": "用户1观点", "claim2": "用户2观点", "doc1Id": "doc1", "doc2Id": "doc2", "description": "冲突描述"}
  ]
}`;
  
  const aiResult = await routeAiCall({
    userId: null,
    task: 'summarize',
    estimatedMaxCostCents: 20,
    prompt
  });
  
  // 4. 解析AI结果
  const result = JSON.parse(aiResult.text.match(/\{[\s\S]*\}/)?.[0] || '{}');
  
  // 5. 计算共识度（优化算法）
  // 方法1：基于共识点和分歧点的数量比例
  const consensusCount = result.consensus?.length || 0;
  const disagreementCount = result.disagreements?.length || 0;
  const totalPoints = consensusCount + disagreementCount;
  
  // 方法2：基于观点的语义相似度（更准确但需要更多计算）
  // 如果共识点数量 > 分歧点数量，共识度较高
  // 如果共识点数量 = 分歧点数量，共识度为0.5
  // 如果共识点数量 < 分歧点数量，共识度较低
  const consensusScore = totalPoints > 0
    ? consensusCount / totalPoints
    : 0.5; // 如果没有分析结果，默认0.5
  
  const divergenceScore = 1 - consensusScore;
  
  return {
    consensusScore,
    divergenceScore,
    consensus: result.consensus || [],
    disagreements: result.disagreements || []
  };
}
```

### 2. 话题级别共识度计算

```typescript
/**
 * 计算话题级别的整体共识度
 * 基于所有用户对的共识度进行加权平均
 */
async function calculateTopicConsensus(topicId: string): Promise<{
  consensusScore: number;
  divergenceScore: number;
  userPairCount: number;
}> {
  // 1. 获取所有用户对
  const userPairs = await prisma.userConsensus.findMany({
    where: { topicId },
    select: {
      userId1: true,
      userId2: true,
      consensusScore: true,
      divergenceScore: true,
      docIds: true
    }
  });
  
  if (userPairs.length === 0) {
    return {
      consensusScore: 0.5,
      divergenceScore: 0.5,
      userPairCount: 0
    };
  }
  
  // 2. 计算加权平均（权重考虑多个因素）
  let totalWeight = 0;
  let weightedConsensus = 0;
  
  userPairs.forEach(pair => {
    if (pair.consensusScore !== null) {
      // 权重计算：
      // - 基础权重：文档数量（讨论越深入，权重越高）
      // - 可选：讨论深度（深度越深，权重越高）
      // - 可选：讨论轮数（轮数越多，权重越高）
      const docWeight = pair.docIds.length;
      const depthWeight = pair.discussionPaths.reduce((sum, path) => sum + path.depth, 0) / pair.discussionPaths.length || 1;
      const roundWeight = pair.discussionPaths.length; // 讨论轮数
      
      // 综合权重（可以根据实际情况调整公式）
      const weight = docWeight * (1 + depthWeight * 0.1) * (1 + roundWeight * 0.2);
      
      weightedConsensus += pair.consensusScore * weight;
      totalWeight += weight;
    }
  });
  
  const consensusScore = totalWeight > 0 
    ? weightedConsensus / totalWeight 
    : 0.5;
  const divergenceScore = 1 - consensusScore;
  
  return {
    consensusScore,
    divergenceScore,
    userPairCount: userPairs.length
  };
}
```

## UI 设计

### 1. 用户列表组件

```tsx
<UserList>
  {users.map(user => (
    <UserCard 
      key={user.userId}
      user={user}
      onClick={() => viewConsensusWithUser(user.userId)}
      highlight={user.userId === currentUserId}
    />
  ))}
</UserList>
```

### 2. 用户对共识详情组件

```tsx
<UserPairConsensus>
  <Header>
    <User1>{user1.email}</User1>
    <VS>vs</VS>
    <User2>{user2.email}</User2>
  </Header>
  
  <Metrics>
    <ConsensusScore>{consensusScore * 100}%</ConsensusScore>
    <DivergenceScore>{divergenceScore * 100}%</DivergenceScore>
  </Metrics>
  
  <ConsensusList>
    {consensus.map(item => (
      <ConsensusItem key={item.text}>
        {item.text}
        <SupportCount>{item.supportCount} 个文档支持</SupportCount>
      </ConsensusItem>
    ))}
  </ConsensusList>
  
  <DisagreementList>
    {disagreements.map(item => (
      <DisagreementItem key={item.claim1}>
        <Claim1>{item.claim1}</Claim1>
        <VS>vs</VS>
        <Claim2>{item.claim2}</Claim2>
        <Description>{item.description}</Description>
      </DisagreementItem>
    ))}
  </DisagreementList>
</UserPairConsensus>
```

## 实现步骤

1. **数据库迁移**：添加 `UserConsensus` 模型
2. **用户对识别**：实现 `identifyUserPairs` 函数
3. **用户对分析**：实现 `calculateUserPairConsensus` 函数
4. **话题级别计算**：实现 `calculateTopicConsensus` 函数
5. **API实现**：实现三个API端点
6. **UI实现**：用户列表和用户对详情组件
7. **缓存优化**：避免重复分析相同的用户对

## 优势

1. **以用户为中心**：符合用户的使用习惯
2. **清晰的交互**：点击用户名查看详情
3. **准确的量化**：话题级别共识度基于用户对聚合
4. **可扩展性**：易于添加更多用户级别的分析功能

