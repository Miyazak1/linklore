# ChatGPT 生成 Prompt

## 完整 Prompt（复制到 ChatGPT）

```
你是一个专业的公共议题思考游戏设计师。请为一个名为"[议题主题]"的议题设计一个完整的思考游戏。

**重要**：请根据议题主题自动生成一个合适的标题，不要使用占位符。标题应该简洁明了（20字以内），能够准确概括议题的核心问题。

## 要求

1. **中立性**：议题必须中立，不偏向任何立场，不包含情绪化词汇
2. **引导思考**：每个阶段的问题要引导用户深入思考，而不是简单的是非判断
3. **选项平衡**：每个选项都要有合理的理由和代价，不能有明显的"正确"或"错误"选项
4. **真实性**：案例描述要包含具体的数据、不同群体的反应，让用户感受到真实场景
5. **完整性**：必须包含阶段0-5，每个阶段2-3个选项，形成完整的决策树

## 数据结构

请生成一个完整的 JSON 对象，包含以下结构：

```json
{
  "title": "根据议题主题生成的标题（不要使用占位符，直接生成具体标题，20字以内）",
  "caseDescription": "阶段0的案例描述（200-300字，描述一个具体的公共问题场景，包含数据、不同群体的反应等）",
  "category": "分类（社会/经济/教育/环境/科技/文化）",
  "difficulty": 3,
  "nodes": [
    {
      "stage": 0,
      "nodeKey": "stage0",
      "title": "案例呈现",
      "content": "（与caseDescription相同）",
      "parentNodeKey": null,
      "nextNodeKeys": ["stage1_optionA", "stage1_optionB", "stage1_optionC"],
      "isRoot": true,
      "order": 0
    },
    {
      "stage": 1,
      "nodeKey": "stage1_optionA",
      "title": "阶段1的问题标题（如：你认为最值得优先关注的是？）",
      "content": "选项A的内容（如：直接后果 - 谁受影响）",
      "parentNodeKey": "stage0",
      "nextNodeKeys": ["stage2_optionA", "stage2_optionB"],
      "isRoot": false,
      "order": 0
    },
    {
      "stage": 1,
      "nodeKey": "stage1_optionB",
      "title": "阶段1的问题标题（与选项A相同）",
      "content": "选项B的内容",
      "parentNodeKey": "stage0",
      "nextNodeKeys": ["stage2_optionC", "stage2_optionD"],
      "isRoot": false,
      "order": 1
    },
    {
      "stage": 1,
      "nodeKey": "stage1_optionC",
      "title": "阶段1的问题标题（与选项A相同）",
      "content": "选项C的内容",
      "parentNodeKey": "stage0",
      "nextNodeKeys": ["stage2_optionE", "stage2_optionF"],
      "isRoot": false,
      "order": 2
    }
    // ... 继续生成阶段2-5的节点
  ]
}
```

## 重要规则

1. **阶段结构**：
   - 阶段0：根节点，展示案例描述
   - 阶段1-5：每个阶段2-3个选项
   - 每个阶段的问题标题要相同（同一个问题，不同选项）

2. **节点Key命名规则**：
   - 格式：`stage{阶段号}_option{选项字母}`
   - 选项字母：A, B, C, D, E, F...
   - 例如：`stage1_optionA`, `stage2_optionB`, `stage3_optionC`

3. **决策树路径**：
   - 每个节点通过 `nextNodeKeys` 数组指定可以到达的下一个节点
   - 确保所有路径最终都能到达阶段5
   - 不同选择可以汇聚到同一个节点（支持路径合并）

4. **内容要求**：
   - 案例描述：200-300字，包含具体数据、时间、地点、不同群体的反应
   - 节点标题：简洁明了，10-20字
   - 节点内容：选项描述，30-100字，说明选择这个选项的理由和可能的影响

5. **中立性检查**：
   - 不使用"左派"、"右派"、"激进"、"保守"等标签词
   - 不使用"应该"、"必须"等强制性词汇
   - 每个选项都有合理的理由和代价

## 输出要求

请直接返回 JSON 格式，不要包含任何其他说明文字。确保 JSON 格式完全正确，可以直接被 JSON.parse() 解析。

现在请为议题"[议题主题]"生成完整的数据结构。
```

## 使用说明

1. 将上面的 prompt 复制到 ChatGPT
2. 将 `[议题主题]` 替换为你要创建的议题，例如：
   - "城市交通拥堵"
   - "教育资源分配"
   - "房价问题"
   - "边缘群体权益"
   - "城市公共资源分配"
3. ChatGPT 会返回完整的 JSON 结构，**标题会自动生成**，不需要手动修改
4. 直接复制 JSON 并导入到创建页面即可

## 快速版本（如果完整版太长）

```
请为一个名为"[议题主题]"的公共议题设计思考游戏。

要求：
1. 中立、平衡，不偏向任何立场
2. 包含阶段0-5，每个阶段2-3个选项
3. 案例描述200-300字，包含具体数据

返回 JSON 格式：
{
  "title": "标题",
  "caseDescription": "案例描述",
  "category": "分类",
  "difficulty": 3,
  "nodes": [
    {
      "stage": 0,
      "nodeKey": "stage0",
      "title": "案例呈现",
      "content": "案例描述",
      "parentNodeKey": null,
      "nextNodeKeys": ["stage1_optionA", "stage1_optionB"],
      "isRoot": true,
      "order": 0
    }
    // ... 其他节点
  ]
}

节点Key格式：stage{阶段号}_option{字母}
请直接返回 JSON，不要其他说明。
```

