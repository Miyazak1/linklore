# 聊天模块数据库访问层

## 使用方式

### 基本用法

```typescript
import { chatDb } from '@/lib/modules/chat/db';

// 查询聊天室
const rooms = await chatDb.rooms.findMany({
  where: { creatorId: userId },
  include: { creator: true }
});

// 创建聊天室
const room = await chatDb.rooms.create({
  data: {
    type: 'SOLO',
    creatorId: userId,
    status: 'ACTIVE'
  }
});

// 查询消息
const messages = await chatDb.messages.findMany({
  where: { roomId },
  orderBy: { createdAt: 'desc' },
  take: 50
});

// 创建消息
const message = await chatDb.messages.create({
  data: {
    roomId,
    senderId: userId,
    content: 'Hello',
    contentType: 'USER',
    sequence: 1
  }
});

// 查询分析结果
const analysis = await chatDb.analysis.findUnique({
  where: { roomId }
});
```

### 迁移指南

#### 从 `prisma.chatRoom` 迁移到 `chatDb.rooms`

```typescript
// 旧代码
import { prisma } from '@/lib/db/client';
const room = await prisma.chatRoom.findUnique({ where: { id } });

// 新代码
import { chatDb } from '@/lib/modules/chat/db';
const room = await chatDb.rooms.findUnique({ where: { id } });
```

#### 从 `prisma.chatMessage` 迁移到 `chatDb.messages`

```typescript
// 旧代码
const messages = await prisma.chatMessage.findMany({ where: { roomId } });

// 新代码
const messages = await chatDb.messages.findMany({ where: { roomId } });
```

## 注意事项

1. **向后兼容**: 旧代码可以继续使用 `prisma.chatRoom`，但新代码应使用 `chatDb`
2. **类型安全**: `chatDb` 的方法签名与 `prisma` 完全相同，类型检查不受影响
3. **性能**: 零性能开销，只是函数转发

## 可用方法

### chatDb.rooms
- `findMany`, `findUnique`, `findFirst`
- `create`, `update`, `delete`, `deleteMany`
- `count`, `aggregate`, `groupBy`, `upsert`

### chatDb.messages
- 同上

### chatDb.analysis
- 同上

### chatDb.messageReferences
- 同上





