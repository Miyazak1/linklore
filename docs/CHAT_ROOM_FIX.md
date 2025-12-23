# 聊天室加载错误修复方案

## 问题诊断

### 错误现象
- API 返回 500 状态码
- 错误信息：`Error converting field "type" of expected non-nullable type "String", found incompatible value of "DUO"`

### 根本原因
1. **数据库表已存在**：ChatRoom 和 ChatMessage 表已经在数据库中
2. **Schema 不匹配**：
   - 数据库中的 `type` 和 `status` 字段是枚举类型（`ChatRoomType`, `ChatRoomStatus`）
   - Schema 中定义为 `String` 类型
   - 数据库中的 `contentType` 是枚举类型 `MessageType`
   - 数据库中的 `moderationStatus` 是枚举类型 `ModerationStatus`
3. **字段缺失**：Schema 中缺少一些数据库已存在的字段

## 已完成的修复

### 1. 更新 ChatRoom 模型
- ✅ 添加 `ChatRoomType` 枚举（SOLO, DUO）
- ✅ 添加 `ChatRoomStatus` 枚举（ACTIVE, ARCHIVED, DISSOLVED）
- ✅ 添加所有缺失字段：
  - `creatorAiConfigId`, `participantAiConfigId`
  - `invitedAt`, `joinedAt`, `dissolvedAt`, `archivedAt`
  - `topicChangeRequest`, `topicChangeRequestedAt`, `topicChangeRequestedBy`
  - `creatorCharterAccepted`, `participantCharterAccepted`

### 2. 更新 ChatMessage 模型
- ✅ 添加 `MessageType` 枚举（USER, AI_SUGGESTION, AI_ADOPTED）
- ✅ 添加 `ModerationStatus` 枚举（PENDING, SAFE, WARNING, BLOCKED）
- ✅ 添加所有缺失字段：
  - `originalSuggestionId`
  - `isStreaming`, `streamingCompleted`
  - `moderationScore`
  - `updatedAt`

### 3. 改进错误处理
- ✅ 添加详细的错误日志
- ✅ 前端显示更详细的错误信息

## 需要执行的步骤

### 步骤 1: 重新生成 Prisma Client

**重要**：需要先停止开发服务器（如果正在运行）

```bash
# 方法1：使用 pnpm script
pnpm --filter @linklore/web prisma:generate

# 方法2：直接运行
cd apps/web
npx prisma generate --schema=../../prisma/schema.prisma
```

### 步骤 2: 重启开发服务器

```bash
pnpm dev
```

### 步骤 3: 验证修复

1. 打开浏览器开发者工具
2. 访问聊天页面
3. 检查是否还有 500 错误
4. 查看控制台错误信息（如果有）

## 如果仍有问题

### 检查 ChatMessageReference 表

如果 ChatMessageReference 表不存在，需要创建：

```sql
-- 检查表是否存在
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ChatMessageReference'
);
```

如果不存在，执行 `prisma/migrations/manual_add_chat_models.sql` 中的相关部分。

## 回滚方案（如果需要）

如果修复后出现问题，可以：

1. **恢复 schema**：从 git 恢复 `prisma/schema.prisma`
2. **重新生成**：`pnpm prisma:generate`
3. **重启服务器**

## 注意事项

- ✅ **不会破坏原有功能**：只是更新 schema 以匹配现有数据库结构
- ✅ **不会丢失数据**：没有删除或修改数据库表
- ✅ **向后兼容**：所有现有字段都已包含在 schema 中





