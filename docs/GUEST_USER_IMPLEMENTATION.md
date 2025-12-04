# 匿名用户（访客）功能实现文档

**实现日期**: 2025-01-XX  
**功能**: 允许未登录用户以随机用户名形式访问聊天页面

---

## 一、功能概述

### 核心需求
1. ✅ 未登录用户可以访问聊天页面（首页）
2. ✅ 未登录用户使用随机用户名（格式：`访客_ABC123`）
3. ✅ 已登录用户使用其真实账号
4. ✅ 匿名用户只能创建 SOLO 聊天室（不能创建 DUO）
5. ✅ 匿名用户的消息永久保存
6. ✅ 注册/登录后可以关联匿名用户的历史数据

---

## 二、实现细节

### 1. 匿名用户管理工具 (`lib/auth/guest.ts`)

**功能**：
- `generateGuestName()`: 生成随机用户名（`访客_ABC123`）
- `generateGuestEmail()`: 生成临时邮箱（`guest_{randomId}@temp.local`）
- `getOrCreateGuestUser()`: 创建或获取匿名用户
- `isGuestUser()`: 检查用户是否是匿名用户
- `associateGuestData()`: 关联匿名用户数据到注册用户
- `cleanupInactiveGuestUsers()`: 清理30天未使用的匿名用户

**关键设计**：
- 匿名用户使用 `@temp.local` 邮箱后缀标识
- 匿名用户ID使用 `cuid()` 生成，与注册用户一致
- 数据关联使用事务确保一致性

---

### 2. 匿名用户 API (`/api/auth/guest`)

**端点**: `POST /api/auth/guest`

**功能**：
- 创建或获取匿名用户
- 为匿名用户创建 session（标记 `isGuest: true`）
- 返回匿名用户信息

**请求体**（可选）：
```json
{
  "guestUserId": "clxxx..." // 如果提供，尝试获取现有匿名用户
}
```

**响应**：
```json
{
  "ok": true,
  "user": {
    "id": "clxxx...",
    "name": "访客_ABC123",
    "email": "guest_abc123@temp.local",
    "isGuest": true
  }
}
```

---

### 3. 聊天页面修改 (`app/(main)/chat/page.tsx`)

**变更**：
- 移除强制登录检查
- 如果未登录，自动调用 `/api/auth/guest` 创建匿名用户
- 在 `localStorage` 保存 `guestUserId`
- 如果用户已登录，清除 `guestUserId`

**流程**：
```
访问 /chat
  ↓
检查 /api/auth/me
  ↓
未登录？
  ↓
调用 /api/auth/guest 创建匿名用户
  ↓
保存 guestUserId 到 localStorage
  ↓
正常使用聊天功能
```

---

### 4. 聊天 API 修改

#### 4.1 创建房间 API (`/api/chat/rooms`)

**变更**：
- 支持匿名用户创建房间
- **限制**：匿名用户只能创建 `SOLO` 类型房间
- 如果匿名用户尝试创建 `DUO` 房间，返回 403 错误

#### 4.2 发送消息 API (`/api/chat/rooms/[id]/messages`)

**变更**：
- 支持匿名用户发送消息
- 消息正常保存到数据库
- 匿名用户的消息与注册用户消息格式一致

#### 4.3 获取消息 API (`/api/chat/rooms/[id]/messages`)

**变更**：
- 支持匿名用户查看消息
- 消息显示格式与注册用户一致

---

### 5. Session 管理修改

**变更**：
- Session payload 支持 `isGuest` 字段
- 匿名用户的 session 与注册用户使用相同的机制
- Session 有效期：7 天

**Session 结构**：
```typescript
{
  sub: string,        // 用户ID
  email: string,      // 邮箱
  role: string,       // 角色
  isGuest?: boolean   // 是否是匿名用户
}
```

---

### 6. Middleware 修改 (`middleware.ts`)

**变更**：
- `/chat` 路由不再需要登录
- 注释说明：`/chat` 支持匿名用户访问
- 其他受保护路由（`/upload`, `/settings`, `/shelf`）仍需要登录

---

### 7. 注册/登录关联功能

#### 7.1 注册 API (`/api/auth/signup`)

**变更**：
- 接受 `guestUserId` 参数
- 注册成功后，自动关联匿名用户数据
- 清除旧的 session，创建新用户的 session

**流程**：
```
用户注册
  ↓
检查 localStorage 中的 guestUserId
  ↓
如果有，传递给注册 API
  ↓
注册成功后，关联匿名用户数据
  ↓
清除 guestUserId
  ↓
切换到真实账号
```

#### 7.2 登录 API (`/api/auth/signin`)

**变更**：
- 接受 `guestUserId` 参数
- 登录成功后，自动关联匿名用户数据
- 清除旧的 session，创建新用户的 session

**流程**：
```
用户登录
  ↓
检查 localStorage 中的 guestUserId
  ↓
如果有，传递给登录 API
  ↓
登录成功后，关联匿名用户数据
  ↓
清除 guestUserId
  ↓
切换到真实账号
```

---

## 三、数据关联范围

当匿名用户注册/登录后，以下数据会被关联到新账号：

1. ✅ 聊天室（作为创建者的）
2. ✅ 聊天室（作为参与者的）
3. ✅ 消息
4. ✅ 消息点赞
5. ✅ 聊天邀请（发送的）
6. ✅ 聊天邀请（接收的）
7. ✅ 匿名用户记录（关联后删除）

**注意**：关联使用数据库事务，确保数据一致性。

---

## 四、客户端存储

### localStorage 键

- `guestUserId`: 匿名用户ID（用于注册/登录时关联数据）

### 使用场景

1. **创建匿名用户时**：
   ```javascript
   localStorage.setItem('guestUserId', guestUser.id);
   ```

2. **注册/登录时**：
   ```javascript
   const guestUserId = localStorage.getItem('guestUserId');
   // 传递给注册/登录 API
   ```

3. **注册/登录成功后**：
   ```javascript
   localStorage.removeItem('guestUserId');
   ```

---

## 五、限制和约束

### 匿名用户限制

1. ❌ **不能创建 DUO 聊天室**（只能创建 SOLO）
2. ✅ 可以发送消息
3. ✅ 可以查看消息
4. ✅ 可以创建 SOLO 聊天室
5. ✅ 可以加入其他用户的 SOLO 聊天室（转为 DUO）

### 数据清理

- 30 天未使用的匿名用户及其数据会被自动清理
- 清理标准：该用户创建的所有聊天室的最后更新时间都超过 30 天

---

## 六、测试步骤

### 测试用例 1：匿名用户访问聊天页面

1. **前置条件**：未登录状态
2. **操作步骤**：
   - 访问首页 `/`
   - 应该自动跳转到 `/chat`
   - 不应该要求登录
3. **预期结果**：
   - 显示聊天页面
   - 用户名显示为 `访客_XXXXXX` 格式
   - `localStorage` 中有 `guestUserId`

### 测试用例 2：匿名用户创建聊天室

1. **前置条件**：匿名用户已登录
2. **操作步骤**：
   - 点击"创建新聊天"
   - 设置话题
   - 创建聊天室
3. **预期结果**：
   - 成功创建 SOLO 聊天室
   - 可以发送消息
   - 消息正常显示

### 测试用例 3：匿名用户尝试创建 DUO 聊天室

1. **前置条件**：匿名用户已登录
2. **操作步骤**：
   - 尝试创建 DUO 聊天室（通过 API 直接调用）
3. **预期结果**：
   - 返回 403 错误
   - 提示"匿名用户只能创建单人聊天室"

### 测试用例 4：注册后关联数据

1. **前置条件**：
   - 匿名用户已创建聊天室和消息
   - `localStorage` 中有 `guestUserId`
2. **操作步骤**：
   - 注册新账号
   - 使用注册的账号登录
3. **预期结果**：
   - 注册/登录成功后，之前的聊天室和消息都关联到新账号
   - `localStorage` 中的 `guestUserId` 被清除
   - 可以正常查看之前的聊天记录

### 测试用例 5：登录后关联数据

1. **前置条件**：
   - 匿名用户已创建聊天室和消息
   - 已有注册账号
   - `localStorage` 中有 `guestUserId`
2. **操作步骤**：
   - 使用已有账号登录
3. **预期结果**：
   - 登录成功后，匿名用户的聊天室和消息都关联到登录账号
   - `localStorage` 中的 `guestUserId` 被清除
   - 可以正常查看之前的聊天记录

---

## 七、文件变更清单

### 新增文件

1. `apps/web/lib/auth/guest.ts` - 匿名用户管理工具
2. `apps/web/app/api/auth/guest/route.ts` - 匿名用户 API

### 修改文件

1. `apps/web/app/(main)/chat/page.tsx` - 支持匿名用户访问
2. `apps/web/app/api/chat/rooms/route.ts` - 支持匿名用户创建房间（限制 SOLO）
3. `apps/web/app/api/chat/rooms/[id]/messages/route.ts` - 支持匿名用户发送消息
4. `apps/web/app/api/auth/me/route.ts` - 返回 `isGuest` 字段
5. `apps/web/app/api/auth/signup/route.ts` - 支持关联匿名用户数据
6. `apps/web/app/api/auth/signin/route.ts` - 支持关联匿名用户数据
7. `apps/web/app/(auth)/signup/page.tsx` - 传递 `guestUserId`
8. `apps/web/app/(auth)/signin/page.tsx` - 传递 `guestUserId`
9. `apps/web/middleware.ts` - `/chat` 不再需要登录

---

## 八、已知问题和限制

### 已知问题

1. **匿名用户清理**：目前清理功能需要手动调用，建议添加定时任务
2. **数据关联提示**：注册/登录时没有提示用户是否要关联数据（目前自动关联）

### 未来改进

1. 添加定时任务自动清理长期未使用的匿名用户
2. 在注册/登录时提示用户是否要关联匿名用户数据
3. 添加匿名用户数据统计功能

---

## 九、回退方案

如果需要回退此功能：

1. **恢复聊天页面登录检查**：
   - 修改 `apps/web/app/(main)/chat/page.tsx`，恢复登录检查
   
2. **恢复 middleware**：
   - 修改 `apps/web/middleware.ts`，将 `/chat` 加入 `protectedRoutes`

3. **删除匿名用户相关代码**：
   - 删除 `apps/web/lib/auth/guest.ts`
   - 删除 `apps/web/app/api/auth/guest/route.ts`
   - 恢复相关 API 的登录检查

4. **清理数据库**：
   - 删除所有 `email` 以 `@temp.local` 结尾的用户及其数据

---

**文档版本**: v1.0  
**最后更新**: 2025-01-XX

