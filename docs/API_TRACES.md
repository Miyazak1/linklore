# 溯源系统 API 文档

## 概述

本文档描述了语义溯源（Trace）和词条（Entry）系统的 RESTful API 接口。

## 认证

所有 API 请求都需要通过会话认证。编辑相关操作需要 `editor` 或 `admin` 角色。

## 响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

## 溯源 API

### 获取溯源列表

**GET** `/api/traces`

**权限**: 需要 `editor` 角色

**查询参数**:
- `page` (number, 默认: 1): 页码
- `pageSize` (number, 默认: 20): 每页数量
- `search` (string, 可选): 搜索关键词（标题或目标）
- `status` (string, 可选): 状态筛选 (`DRAFT`, `PUBLISHED`, `ANALYZING`, `APPROVED`)
- `type` (string, 可选): 类型筛选 (`CONCEPT`, `EVENT`, `FACT`, `PERSON`, `THEORY`, `DEFINITION`)

**响应**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "string",
        "title": "string",
        "traceType": "CONCEPT",
        "target": "string",
        "status": "DRAFT",
        "version": 1,
        "publishedAt": "2024-01-01T00:00:00Z",
        "analyzedAt": null,
        "approvedAt": null,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "analysis": {
          "credibilityScore": 0.85,
          "canApprove": true
        },
        "entry": null
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 创建溯源

**POST** `/api/traces`

**权限**: 需要 `editor` 角色

**请求体**:
```json
{
  "title": "溯源标题",
  "traceType": "CONCEPT",
  "target": "溯源目标描述",
  "body": "正文内容（Markdown格式）",
  "citations": [
    {
      "url": "https://example.com",
      "title": "引用标题",
      "author": "作者",
      "publisher": "出版机构",
      "year": 2024,
      "type": "WEB",
      "quote": "引用片段",
      "page": "页码"
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "status": "DRAFT",
    ...
  }
}
```

### 获取溯源详情

**GET** `/api/traces/[id]`

**权限**: 需要 `editor` 角色，且必须是溯源的所有者

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "traceType": "CONCEPT",
    "target": "string",
    "body": "string",
    "status": "DRAFT",
    "version": 1,
    "editor": {
      "id": "string",
      "email": "string",
      "name": "string"
    },
    "citationsList": [...],
    "analysis": {
      "credibilityScore": 0.85,
      "completenessScore": 0.80,
      "accuracyScore": 0.90,
      "sourceQualityScore": 0.75,
      "strengths": ["优点1", "优点2"],
      "weaknesses": ["不足1"],
      "missingAspects": ["缺失方面"],
      "suggestions": ["建议1"],
      "canApprove": true,
      "analysis": {}
    }
  }
}
```

### 更新溯源

**PUT** `/api/traces/[id]`

**权限**: 需要 `editor` 角色，且必须是溯源的所有者

**请求体**: 同创建溯源

**响应**: 同获取溯源详情

### 删除溯源

**DELETE** `/api/traces/[id]`

**权限**: 需要 `editor` 角色，且必须是溯源的所有者

**响应**:
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

### 发布溯源

**POST** `/api/traces/[id]/publish`

**权限**: 需要 `editor` 角色，且必须是溯源的所有者

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "PUBLISHED",
    "publishedAt": "2024-01-01T00:00:00Z"
  }
}
```

发布后会自动触发 AI 分析。

### 批准溯源（创建词条）

**POST** `/api/traces/[id]/approve`

**权限**: 需要 `editor` 或 `admin` 角色

**响应**:
```json
{
  "success": true,
  "data": {
    "traceId": "string",
    "entryId": "string",
    "entrySlug": "string"
  }
}
```

## 引用 API

### 获取引用列表

**GET** `/api/traces/[id]/citations`

**权限**: 需要 `editor` 角色，且必须是溯源的所有者

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "url": "string",
      "title": "string",
      "author": "string",
      "publisher": "string",
      "year": 2024,
      "type": "WEB",
      "quote": "string",
      "page": "string",
      "order": 1
    }
  ]
}
```

### 创建引用

**POST** `/api/traces/[id]/citations`

**权限**: 需要 `editor` 角色，且必须是溯源的所有者

**请求体**:
```json
{
  "url": "https://example.com",
  "title": "引用标题",
  "author": "作者",
  "publisher": "出版机构",
  "year": 2024,
  "type": "WEB",
  "quote": "引用片段",
  "page": "页码"
}
```

### 更新引用

**PUT** `/api/traces/[id]/citations/[citationId]`

**权限**: 需要 `editor` 角色，且必须是溯源的所有者

**请求体**: 同创建引用

### 删除引用

**DELETE** `/api/traces/[id]/citations/[citationId]`

**权限**: 需要 `editor` 角色，且必须是溯源的所有者

## 词条 API

### 获取词条列表

**GET** `/api/entries`

**查询参数**:
- `page` (number, 默认: 1): 页码
- `pageSize` (number, 默认: 20): 每页数量
- `search` (string, 可选): 搜索关键词
- `type` (string, 可选): 类型筛选

**响应**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "string",
        "slug": "string",
        "title": "string",
        "traceType": "CONCEPT",
        "version": 1,
        "needsUpdate": false,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "sourceTrace": {
          "id": "string",
          "title": "string",
          "editor": {
            "id": "string",
            "email": "string",
            "name": "string"
          }
        }
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 获取词条详情

**GET** `/api/entries/[slug]`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "slug": "string",
    "title": "string",
    "traceType": "CONCEPT",
    "body": "string",
    "version": 1,
    "needsUpdate": false,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "sourceTrace": {
      "id": "string",
      "title": "string",
      "editor": {
        "id": "string",
        "email": "string",
        "name": "string"
      }
    },
    "citationsList": [...]
  }
}
```

## 草稿 API

### 保存草稿

**POST** `/api/traces/draft` 或 `/api/traces/[id]/draft`

**权限**: 需要 `editor` 角色

**请求体**:
```json
{
  "title": "string",
  "traceType": "CONCEPT",
  "target": "string",
  "body": "string",
  "citations": []
}
```

### 加载草稿

**GET** `/api/traces/draft` 或 `/api/traces/[id]/draft`

**权限**: 需要 `editor` 角色

**响应**:
```json
{
  "success": true,
  "data": {
    "title": "string",
    "traceType": "CONCEPT",
    "target": "string",
    "body": "string",
    "citations": []
  }
}
```

## 错误码

- `UNAUTHORIZED`: 未认证
- `FORBIDDEN`: 权限不足
- `NOT_FOUND`: 资源不存在
- `VALIDATION_ERROR`: 验证失败
- `RATE_LIMIT_EXCEEDED`: 请求频率过高
- `INTERNAL_ERROR`: 服务器内部错误

## 限流

溯源相关 API 的限流规则：
- 创建/更新溯源: 每分钟 10 次
- 发布溯源: 每小时 5 次
- 其他操作: 每分钟 30 次

