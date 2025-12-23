# 模块隔离规范

**更新时间**: 2025-12-19  
**状态**: 渐进式实施中

---

## 一、目的

确保不同功能模块（聊天、讨论版、图书馆、语义溯源等）之间的隔离，避免新增功能或优化时影响其他模块。

---

## 二、模块划分

### 1. 聊天模块 (`chat`)
- **路由**: `/chat`, `/api/chat/*`
- **组件**: `components/chat/*`
- **数据库模型**: `ChatRoom`, `ChatMessage`, `ChatAnalysis`, `ChatMessageReference`
- **数据库访问**: `lib/modules/chat/db.ts`

### 2. 讨论版模块 (`discussion`)
- **路由**: `/upload`, `/topics/*`, `/api/topics/*`
- **组件**: `components/topic/*`
- **数据库模型**: `Topic`, `Document`, `Summary`, `Evaluation`, `Disagreement`, `ConsensusSnapshot`, `UserConsensus`
- **数据库访问**: 待创建 `lib/modules/discussion/db.ts`

### 3. 语义溯源模块 (`trace`)
- **路由**: `/traces/*`, `/api/traces/*`
- **组件**: `components/trace/*`
- **数据库模型**: `Trace`, `Citation`, `TraceAnalysis`, `Entry`
- **数据库访问**: 待创建 `lib/modules/trace/db.ts`

### 4. 图书馆模块 (`library`)
- **路由**: `/library`, `/api/books/*`
- **组件**: `components/library/*`
- **数据库模型**: `Book`, `BookshelfItem`, `BookAsset`
- **数据库访问**: 待创建 `lib/modules/library/db.ts`

---

## 三、隔离规则

### 规则 1: 数据库访问隔离

**禁止**: 跨模块直接访问其他模块的数据库模型

```typescript
// ❌ 错误：在聊天模块中直接访问讨论版的表
import { prisma } from '@/lib/db/client';
const topic = await prisma.topic.findUnique({ ... });
```

**正确**: 使用模块的数据库访问层

```typescript
// ✅ 正确：在聊天模块中使用聊天数据库访问层
import { chatDb } from '@/lib/modules/chat/db';
const room = await chatDb.rooms.findUnique({ ... });

// ✅ 正确：需要访问其他模块时，通过 API 或接口
const res = await fetch('/api/topics/123');
const topic = await res.json();
```

### 规则 2: 组件隔离

**禁止**: 跨模块直接导入其他模块的内部组件

```typescript
// ❌ 错误：在聊天模块中直接导入讨论版的内部组件
import DocumentTree from '@/components/topic/DocumentTree';
```

**正确**: 使用共享组件或通过 props 传递

```typescript
// ✅ 正确：使用共享组件
import BookSearchDialog from '@/shared/components/BookSearchDialog';

// ✅ 正确：通过 props 传递（如果组件是模块专用的）
<SomeComponent onSelectBook={handleBookSelect} />
```

### 规则 3: API 路由隔离

**禁止**: 在 API 路由中直接调用其他模块的内部逻辑

```typescript
// ❌ 错误：在聊天 API 中直接调用讨论版的内部函数
import { createTopic } from '@/lib/processing/topicOperations';
const topic = await createTopic(...);
```

**正确**: 通过 HTTP 请求或共享服务

```typescript
// ✅ 正确：通过 HTTP 请求
const res = await fetch('/api/topics', {
  method: 'POST',
  body: JSON.stringify({ ... })
});

// ✅ 正确：使用共享服务（如果确实需要共享）
import { topicService } from '@/shared/services/topic';
```

### 规则 4: 类型定义隔离

**禁止**: 跨模块直接导入其他模块的内部类型

```typescript
// ❌ 错误：在聊天模块中直接导入讨论版的内部类型
import type { Topic } from '@/lib/types/topic';
```

**正确**: 使用共享类型或接口

```typescript
// ✅ 正确：使用共享类型
import type { Book } from '@/shared/types/library';

// ✅ 正确：使用模块接口
import type { IDiscussionModule } from '@/lib/modules/interfaces';
```

---

## 四、共享资源

以下资源是**所有模块共享**的，可以自由使用：

### 1. 基础设施
- `lib/db/client.ts` - 数据库客户端（但应通过模块访问层使用）
- `lib/auth/*` - 认证系统
- `lib/ai/*` - AI 功能
- `lib/utils/*` - 工具函数

### 2. UI 组件
- `components/ui/*` - 基础 UI 组件
- `shared/components/*` - 共享业务组件

### 3. 类型定义
- `shared/types/*` - 共享类型定义

---

## 五、实施状态

### ✅ 已完成

1. **聊天模块数据库访问层**
   - 文件: `lib/modules/chat/db.ts`
   - 状态: 已创建，新代码应使用 `chatDb` 而不是 `prisma.chatRoom`

2. **共享组件目录**
   - 目录: `shared/components/`
   - 状态: 已创建
   - 已移动: `BookSearchDialog`

3. **模块接口定义**
   - 文件: `lib/modules/interfaces.ts`
   - 状态: 已创建

### 🔄 进行中

1. **逐步迁移现有代码**
   - 新代码: 使用 `chatDb` 而不是 `prisma.chatRoom`
   - 旧代码: 可以继续使用 `prisma.chatRoom`（向后兼容）

### 📋 待完成

1. **其他模块的数据库访问层**
   - 讨论版: `lib/modules/discussion/db.ts`
   - 语义溯源: `lib/modules/trace/db.ts`
   - 图书馆: `lib/modules/library/db.ts`

2. **共享服务层**
   - 创建 `shared/services/` 用于模块间通信

---

## 六、检查清单

在新增功能或优化时，请检查：

- [ ] 是否直接访问了其他模块的数据库模型？
- [ ] 是否直接导入了其他模块的内部组件？
- [ ] 是否直接调用了其他模块的内部函数？
- [ ] 是否修改了共享基础设施（auth, db, ai）？
- [ ] 是否影响了其他模块的类型定义？

---

## 七、示例

### 示例 1: 在聊天模块中搜索图书

```typescript
// ✅ 正确：使用共享组件
import BookSearchDialog from '@/shared/components/BookSearchDialog';

// ✅ 正确：通过 API 访问
const res = await fetch('/api/books/search?q=...');
const books = await res.json();
```

### 示例 2: 在聊天模块中创建聊天室

```typescript
// ✅ 正确：使用聊天模块的数据库访问层
import { chatDb } from '@/lib/modules/chat/db';

const room = await chatDb.rooms.create({
  data: {
    type: 'SOLO',
    creatorId: userId,
    status: 'ACTIVE'
  }
});
```

### 示例 3: 在聊天模块中获取话题信息

```typescript
// ✅ 正确：通过 API 访问
const res = await fetch(`/api/topics/${topicId}`);
const topic = await res.json();

// ❌ 错误：直接访问数据库
import { prisma } from '@/lib/db/client';
const topic = await prisma.topic.findUnique({ ... });
```

---

## 八、常见问题

### Q1: 如果两个模块确实需要共享逻辑怎么办？

**A**: 将共享逻辑移到 `shared/services/` 或 `shared/lib/`，两个模块都通过共享服务访问。

### Q2: 旧代码需要立即迁移吗？

**A**: 不需要。采用渐进式迁移：
- 新代码必须遵循隔离规则
- 旧代码可以逐步迁移
- 修改旧代码时顺便迁移

### Q3: 性能会受影响吗？

**A**: 不会。数据库访问层只是函数转发，零性能开销。组件隔离只是路径改变，不影响打包结果。

---

## 九、相关文档

- [模块隔离评估报告](./MODULE_ISOLATION_ASSESSMENT.md)（待创建）
- [数据库访问层设计](./DATABASE_ACCESS_LAYER.md)（待创建）





