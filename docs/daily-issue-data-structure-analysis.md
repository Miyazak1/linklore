# 每日议题数据结构分析

## 一、数据结构定义

### 1.1 数据库 Schema (Prisma)

```prisma
model IssueNode {
  id            String   @id @default(cuid())
  issueId       String
  stage         Int      // 0-5，阶段编号
  nodeKey       String   // 节点唯一标识，如 "stage1_optionA"
  title         String   // 节点标题/问题
  content       String   // 节点内容/选项文本
  parentNodeKey String?  // 父节点key
  nextNodeKeys  Json     // 下一节点数组
  isRoot        Boolean  @default(false)
  order         Int      // 同阶段内的顺序
}
```

### 1.2 TypeScript 类型定义

```typescript
export interface IssueNode {
  id: string;
  issueId: string;
  stage: number; // 0-5
  nodeKey: string;
  title: string;
  content: string;
  parentNodeKey: string | null;
  nextNodeKeys: string[]; // JSON数组
  isRoot: boolean;
  order: number;
}
```

## 二、Prompt 中的数据结构说明

### 2.1 ChatGPT Prompt 说明

根据 `CHATGPT_PROMPT.md`，数据结构应该是：

```json
{
  "stage": 1,
  "nodeKey": "stage1_optionA",
  "title": "阶段1的问题标题（如：你认为最值得优先关注的是？）",
  "content": "选项A的内容（如：直接后果 - 谁受影响）",
  "parentNodeKey": "stage0",
  "nextNodeKeys": ["stage2_optionA", "stage2_optionB"],
  "isRoot": false,
  "order": 0
}
```

**关键点**：
- 选项节点（如 `stage1_optionA`）的 `title` 存储的是**问题**（如"你认为最值得优先关注的是？"）
- 选项节点（如 `stage1_optionA`）的 `content` 存储的是**选项内容**（如"直接后果 - 谁受影响"）
- 同一阶段的所有选项节点（`stage1_optionA`, `stage1_optionB`, `stage1_optionC`）的 `title` 应该**相同**（都是同一个问题）

## 三、创建页面的数据结构

### 3.1 创建页面 (`create/page.tsx`)

创建页面中的节点结构：

```typescript
interface IssueNode {
  stage: number;
  nodeKey: string;
  title: string;        // 节点标题
  content: string;      // 节点内容
  parentNodeKey?: string;
  nextNodeKeys: string[];
  isRoot?: boolean;
  order: number;
}
```

**问题**：创建页面没有明确说明 `title` 和 `content` 的含义，可能导致用户混淆。

### 3.2 创建 API (`create/route.ts`)

创建 API 接收的数据结构：

```typescript
{
  date: string,
  title: string,
  caseDescription: string,
  category?: string,
  difficulty?: number,
  status?: 'draft' | 'published',
  nodes: Array<{
    stage: number,
    nodeKey: string,
    title: string,      // 节点标题
    content: string,    // 节点内容
    parentNodeKey?: string,
    nextNodeKeys: string[],
    isRoot?: boolean,
    order: number
  }>
}
```

## 四、首页显示逻辑

### 4.1 当前显示逻辑 (`DailyTopicBanner.tsx`)

```typescript
// 如果当前节点是选项节点，且 parentNodeKey 指向 stage0
if (isOptionNode && currentNode.parentNodeKey && tree) {
  const parentNode = tree.nodes.get(currentNode.parentNodeKey);
  if (parentNode && parentNode.stage === 0) {
    // 使用选项节点的 title 作为问题
    questionTitle = currentNode.title || '请选择：';
    // 不显示 content，因为选项节点的 content 是选项内容
  }
}
```

**逻辑**：
- 如果当前节点是选项节点（`stage1_optionA`），且 `parentNodeKey` 指向 `stage0`
- 显示 `currentNode.title` 作为问题
- 不显示 `currentNode.content`（因为这是选项内容，会在选项列表中显示）

### 4.2 选项获取逻辑

```typescript
const getOptions = () => {
  if (!currentNode || !tree) return [];
  
  // 如果当前节点是选项节点
  if (currentNode.nodeKey.includes('option')) {
    // 方法1：通过 parentNodeKey 找到问题节点，然后获取所有选项
    if (currentNode.parentNodeKey) {
      const parentQuestionNode = tree.nodes.get(currentNode.parentNodeKey);
      if (parentQuestionNode && parentQuestionNode.nextNodeKeys) {
        // 问题节点的 nextNodeKeys 指向所有选项节点
        return parentQuestionNode.nextNodeKeys.map((optionKey) => {
          const optionNode = tree.nodes.get(optionKey);
          return {
            key: optionKey,
            title: optionNode?.title || optionKey,
            content: optionNode?.content || optionNode?.title || optionKey
          };
        }).filter(opt => opt.key);
      }
    }
    
    // 方法2：如果 parentNodeKey 指向 stage0，从 rootNode 的 nextNodeKeys 获取所有选项
    if (currentNode.parentNodeKey && tree.rootNode) {
      const parentNode = tree.nodes.get(currentNode.parentNodeKey);
      if (parentNode && parentNode.stage === 0 && parentNode.nextNodeKeys) {
        return parentNode.nextNodeKeys.map((optionKey) => {
          const optionNode = tree.nodes.get(optionKey);
          return {
            key: optionKey,
            title: optionNode?.title || optionKey,
            content: optionNode?.content || optionNode?.title || optionKey
          };
        }).filter(opt => opt.key);
      }
    }
  }
  
  // 问题节点：从 nextNodeKeys 获取选项
  const nextNodeKeys = currentNode.nextNodeKeys || [];
  return nextNodeKeys.map((optionKey) => {
    const optionNode = tree.nodes.get(optionKey);
    return {
      key: optionKey,
      title: optionNode?.title || optionKey,
      content: optionNode?.content || optionNode?.title || optionKey
    };
  }).filter(opt => opt.key);
};
```

**逻辑**：
- 如果当前节点是选项节点，通过 `parentNodeKey` 找到父节点（问题节点或 `stage0`），然后获取所有选项节点
- 如果当前节点是问题节点，直接从 `nextNodeKeys` 获取选项节点
- 选项显示时，使用 `option.content` 作为选项文本

## 五、问题分析

### 5.1 数据结构理解不一致

**问题1**：创建页面没有明确说明 `title` 和 `content` 的含义
- 用户可能不知道选项节点的 `title` 应该存储问题
- 用户可能不知道选项节点的 `content` 应该存储选项内容

**问题2**：Prompt 说明不够清晰
- Prompt 中说明了选项节点的 `title` 是问题，`content` 是选项内容
- 但没有明确说明同一阶段的所有选项节点的 `title` 必须相同

**问题3**：显示逻辑复杂
- 需要判断当前节点是选项节点还是问题节点
- 需要判断 `parentNodeKey` 指向的是 `stage0` 还是问题节点
- 选项获取逻辑有多种情况，容易出错

### 5.2 映射关系

**正确的映射关系应该是**：

1. **阶段0（根节点）**：
   - `nodeKey`: `stage0`
   - `title`: `"案例呈现"`
   - `content`: 案例描述（与 `caseDescription` 相同）
   - `nextNodeKeys`: `["stage1_optionA", "stage1_optionB", ...]`（指向阶段1的所有选项节点）

2. **阶段1-5（选项节点）**：
   - `nodeKey`: `stage1_optionA`, `stage1_optionB`, ...
   - `title`: **问题**（如"你认为最值得优先关注的是？"）
   - `content`: **选项内容**（如"直接后果 - 谁受影响"）
   - `parentNodeKey`: 指向父节点（阶段0或上一阶段的选项节点）
   - `nextNodeKeys`: 指向下一阶段的选项节点（如 `["stage2_optionA", "stage2_optionB"]`）
   - **同一阶段的所有选项节点的 `title` 必须相同**

3. **显示逻辑**：
   - 如果当前节点是选项节点，且 `parentNodeKey` 指向 `stage0`：
     - 显示 `currentNode.title` 作为问题
     - 显示所有同阶段选项节点的 `content` 作为选项列表
   - 如果当前节点是选项节点，且 `parentNodeKey` 指向问题节点：
     - 显示父问题节点的 `title` 作为问题
     - 显示所有同阶段选项节点的 `content` 作为选项列表
   - 如果当前节点是问题节点：
     - 显示 `currentNode.title` 作为问题
     - 显示 `currentNode.content` 作为问题描述（如果有）
     - 显示所有 `nextNodeKeys` 指向的选项节点的 `content` 作为选项列表

## 六、建议修复

### 6.1 创建页面改进

1. **添加字段说明**：
   - 在节点编辑对话框中，明确说明 `title` 和 `content` 的含义
   - 对于选项节点，说明 `title` 是问题，`content` 是选项内容

2. **添加验证**：
   - 验证同一阶段的所有选项节点的 `title` 必须相同
   - 如果不同，提示用户修改

### 6.2 Prompt 改进

1. **明确说明**：
   - 强调同一阶段的所有选项节点的 `title` 必须相同
   - 提供更清晰的示例

2. **添加验证规则**：
   - 在 Prompt 中添加验证规则，确保 ChatGPT 生成的 JSON 符合要求

### 6.3 显示逻辑优化

1. **简化逻辑**：
   - 统一处理选项节点和问题节点的显示逻辑
   - 减少条件判断

2. **添加调试信息**：
   - 在控制台输出当前节点的详细信息
   - 帮助排查问题

## 七、测试用例

### 7.1 数据结构测试

1. **测试选项节点的 title 和 content**：
   - 创建阶段1的选项节点 `stage1_optionA`
   - 验证 `title` 是问题，`content` 是选项内容

2. **测试同一阶段的 title 一致性**：
   - 创建阶段1的多个选项节点
   - 验证它们的 `title` 是否相同

### 7.2 显示逻辑测试

1. **测试选项节点显示**：
   - 设置当前节点为 `stage1_optionA`
   - 验证是否正确显示问题和选项列表

2. **测试选项获取**：
   - 测试不同情况下的选项获取逻辑
   - 验证选项列表是否正确





