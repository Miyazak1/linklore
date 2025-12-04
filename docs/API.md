# LinkLore API 文档

## 概述

LinkLore API 使用 RESTful 风格，所有 API 端点都返回 JSON 格式数据。

**Base URL**: `http://localhost:3000/api` (开发环境)

## 认证

大部分 API 需要用户登录。认证通过 HttpOnly Cookie 中的 JWT token 实现。

### 登录

```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**:
```json
{
  "ok": true
}
```

### 注册

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "inviteCode": "INVITE123"
}
```

**响应**:
```json
{
  "ok": true,
  "userId": "user_id"
}
```

### 登出

```http
POST /api/auth/signout
```

**响应**:
```json
{
  "ok": true
}
```

## 速率限制

所有 API 端点都有速率限制：

- **认证端点** (`/api/auth/*`): 10 请求/分钟
- **上传端点** (`/api/uploads/*`): 20 请求/分钟
- **AI 端点** (`/api/ai/*`): 30 请求/分钟
- **其他端点**: 100 请求/分钟

速率限制信息通过响应头返回：
- `X-RateLimit-Limit`: 限制数量
- `X-RateLimit-Remaining`: 剩余请求数
- `X-RateLimit-Reset`: 重置时间（Unix 时间戳）

超过限制时返回 `429 Too Many Requests`。

## 话题 (Topics)

### 获取话题列表

```http
GET /api/topics/list?page=1&limit=20&discipline=all
```

**查询参数**:
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20
- `discipline` (可选): 学科筛选，默认 'all'

**响应**:
```json
{
  "topics": [
    {
      "id": "topic_id",
      "title": "话题标题",
      "authorId": "user_id",
      "author": { "email": "user@example.com" },
      "discipline": "学科",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "documents": [...],
      "_count": { "documents": 5 }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "disciplines": ["学科1", "学科2"]
}
```

### 搜索话题

```http
GET /api/topics/search?q=关键词
```

**查询参数**:
- `q` (必需): 搜索关键词

**响应**:
```json
{
  "topics": [...]
}
```

### 获取话题详情

```http
GET /api/topics/[id]
```

**响应**: 话题详情页面（HTML）

### 获取共识分析

```http
GET /api/topics/[id]/consensus
```

**响应**:
```json
{
  "consensus": [
    {
      "text": "共识观点",
      "supportCount": 3,
      "docIndices": [1, 2, 3]
    }
  ],
  "disagreements": [
    {
      "claim1": "观点A",
      "claim2": "观点B",
      "docIndices": [1, 2]
    }
  ],
  "unverified": [
    {
      "text": "待验证观点",
      "docIndex": 1
    }
  ],
  "totalDocs": 5
}
```

### 获取质量信号

```http
GET /api/topics/[id]/quality
```

**响应**:
```json
{
  "rigor": 8.5,
  "clarity": 7.0,
  "citationCompleteness": 9.0,
  "originality": 8.0,
  "totalEvaluations": 5
}
```

### 导出话题包

```http
GET /api/topics/[id]/export
```

**响应**: ZIP 文件下载

## 文档 (Documents)

### 上传文档

#### 1. 初始化上传

```http
POST /api/uploads/initiate
Content-Type: application/json

{
  "filename": "document.docx",
  "size": 1024000,
  "topicId": "topic_id" // 可选，如果为空则创建新话题
}
```

**响应**:
```json
{
  "uploadUrl": "https://...",
  "key": "uploads/...",
  "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "topicId": "topic_id" // 如果创建了新话题
}
```

#### 2. 上传文件

根据 `uploadUrl` 使用 PUT 或 POST 方法上传文件。

#### 3. 完成上传

```http
POST /api/uploads/complete
Content-Type: application/json

{
  "key": "uploads/...",
  "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "size": 1024000,
  "topicId": "topic_id" // 可选
}
```

**响应**:
```json
{
  "ok": true,
  "topicId": "topic_id",
  "documentId": "document_id"
}
```

### 下载文档

```http
GET /api/documents/[id]/download
```

**响应**: 原始文件下载

## 书籍 (Books)

### 搜索书籍

```http
GET /api/books/search?q=书名&save=false
```

**查询参数**:
- `q` (必需): 搜索关键词
- `save` (可选): 是否保存到数据库，默认 false

**响应**:
```json
{
  "items": [
    {
      "title": "书名",
      "author": "作者",
      "coverUrl": "https://...",
      "source": "openlibrary"
    }
  ]
}
```

### 添加书籍

```http
POST /api/books/add
Content-Type: application/json

{
  "title": "书名",
  "author": "作者",
  "coverUrl": "https://...",
  "overview": "简介",
  "source": "manual"
}
```

**响应**:
```json
{
  "ok": true,
  "book": { ... }
}
```

### 添加到书架

```http
POST /api/books/[id]/shelf
```

**响应**:
```json
{
  "ok": true
}
```

### 从书架移除

```http
DELETE /api/books/[id]/shelf
```

**响应**:
```json
{
  "ok": true
}
```

### 上传电子书

#### 1. 初始化上传

```http
POST /api/books/upload/initiate
Content-Type: application/json

{
  "filename": "book.epub",
  "size": 2048000
}
```

**响应**: 同文档上传

#### 2. 完成上传

```http
POST /api/books/upload
Content-Type: application/json

{
  "key": "uploads/...",
  "mime": "application/epub+zip",
  "size": 2048000,
  "title": "书名",
  "author": "作者"
}
```

**响应**:
```json
{
  "ok": true,
  "bookId": "book_id"
}
```

## AI 配置

### 测试凭证

```http
POST /api/ai/test-credential
Content-Type: application/json

{
  "provider": "siliconflow",
  "apiKey": "sk-...",
  "model": "deepseek-chat",
  "apiEndpoint": "https://api.siliconflow.cn/v1" // 可选
}
```

**响应**:
```json
{
  "ok": true,
  "message": "硅基流动 密钥和模型测试成功"
}
```

### 保存配置

```http
POST /api/ai/config
Content-Type: application/json

{
  "provider": "siliconflow",
  "apiKey": "sk-...",
  "model": "deepseek-chat",
  "apiEndpoint": "https://api.siliconflow.cn/v1", // 可选
  "persist": true
}
```

**响应**:
```json
{
  "ok": true
}
```

### 获取使用量

```http
GET /api/ai/usage
```

**响应**:
```json
{
  "totalCalls": 100,
  "totalCostCents": 500,
  "byProvider": {
    "siliconflow": { "calls": 80, "costCents": 400 },
    "openai": { "calls": 20, "costCents": 100 }
  }
}
```

## 文件服务

### 获取文件

```http
GET /api/files/[key]
```

**响应**: 文件内容（支持 CORS）

## 错误响应

所有错误响应都遵循以下格式：

```json
{
  "error": "错误消息"
}
```

**HTTP 状态码**:
- `400`: 请求错误（验证失败、参数错误等）
- `401`: 未认证
- `403`: 无权限
- `404`: 资源不存在
- `429`: 请求过于频繁
- `500`: 服务器错误

## 审计日志

以下操作会被记录到审计日志：
- 用户登录/登出
- 文档上传
- 话题创建/更新
- 书籍添加
- AI 配置更新
- 分歧登记

审计日志包含：用户ID、操作类型、资源信息、IP地址、User-Agent等。










