# 语义溯源系统修复报告

**修复日期**：2025-12-21  
**修复范围**：评估报告中发现的严重问题  
**修复状态**：✅ 已完成

---

## 一、修复清单

### 1. ✅ 批准前缺少可信度检查

**问题描述**：
- 批准溯源时，没有检查 AI 分析结果的 `canApprove` 标志
- 可能批准可信度 < 0.7 的溯源

**修复位置**：
- `apps/web/lib/processing/entryOperations.ts::createEntryFromTrace`

**修复内容**：
```typescript
// 检查AI分析结果和可信度
if (!trace.analysis) {
    throw new Error('溯源尚未完成AI分析，无法批准');
}

if (!trace.analysis.canApprove) {
    throw new Error(
        `溯源可信度不足（可信度 ${trace.analysis.credibilityScore.toFixed(2)} < 0.7），无法批准。请根据AI分析建议改进后重新发布。`
    );
}
```

**影响**：
- ✅ 防止批准不可信的溯源
- ✅ 提供清晰的错误信息，告知用户可信度分数
- ✅ 引导用户根据 AI 分析建议改进

---

### 2. ✅ previousVersionId 逻辑错误

**问题描述**：
- `previousVersionId: traceId` 逻辑不正确
- 由于版本号递增但ID不变，版本历史记录存在设计问题

**修复位置**：
- `apps/web/lib/processing/traceOperations.ts::updateTrace`

**修复内容**：
```typescript
// 只在首次更新时设置 previousVersionId = null（表示这是第一次更新，没有上一版本）
// 后续更新不改变 previousVersionId，因为ID不变，无法真正指向"上一版本"
if (trace.version === 1) {
    updateData.previousVersionId = null;
}
```

**说明**：
- 由于版本号递增但ID不变，`previousVersionId` 的设计存在局限性
- 当前实现：只在首次更新（version 1 -> 2）时设置 `previousVersionId = null`
- 后续更新不改变 `previousVersionId`，因为ID不变，无法真正指向"上一版本"
- 注意：如果需要真正的版本历史，应该考虑创建新记录（新ID）而不是更新现有记录

**影响**：
- ✅ 修复版本历史记录逻辑
- ⚠️ 版本历史功能仍有限制（需要重新设计才能完全支持）

---

### 3. ✅ Citations 字段同步问题

**问题描述**：
- `Trace.citations` (JSON) 和 `citationsList` (关系) 可能不一致
- 更新引用时，需要确保两个字段同步

**修复位置**：
- `apps/web/lib/processing/traceOperations.ts::updateTrace`

**修复内容**：
```typescript
// 如果更新了引用，先处理引用关系字段
if (data.citations) {
    // 删除旧引用
    await tx.citation.deleteMany({ where: { traceId } });

    // 创建新引用
    const newCitations = await Promise.all(...);

    // 从关系字段生成 JSON 字段，确保数据一致性
    citationsJson = newCitations.map((c) => ({
        id: c.id,
        url: c.url,
        title: c.title,
        // ... 其他字段
    }));
}

// 在更新溯源时，使用从关系字段生成的 JSON
const updateData: any = {
    // ...
    ...(citationsJson !== undefined 
        ? { citations: citationsJson as any }
        : data.citations !== undefined 
            ? { citations: data.citations as any }
            : {}
    ),
    // ...
};
```

**影响**：
- ✅ 确保 JSON 字段和关系字段同步
- ✅ 从关系字段生成 JSON 字段，保证数据一致性
- ✅ 避免数据不一致问题

---

## 二、测试建议

### 2.1 批准前可信度检查测试

**测试用例 1：正常批准**
1. 创建一个溯源
2. 发布并等待 AI 分析完成
3. 确保可信度 ≥ 0.7
4. 尝试批准溯源
5. **预期结果**：批准成功

**测试用例 2：可信度不足**
1. 创建一个溯源
2. 发布并等待 AI 分析完成
3. 确保可信度 < 0.7（可能需要手动修改分析结果或创建低质量溯源）
4. 尝试批准溯源
5. **预期结果**：批准失败，显示错误信息："溯源可信度不足（可信度 X.XX < 0.7），无法批准"

**测试用例 3：未完成分析**
1. 创建一个溯源
2. 发布但 AI 分析尚未完成（或分析失败）
3. 尝试批准溯源
4. **预期结果**：批准失败，显示错误信息："溯源尚未完成AI分析，无法批准"

### 2.2 版本历史测试

**测试用例 1：首次更新**
1. 创建一个溯源（version = 1）
2. 更新溯源
3. 检查 `previousVersionId` 字段
4. **预期结果**：`previousVersionId = null`

**测试用例 2：后续更新**
1. 创建一个溯源（version = 1）
2. 更新溯源（version = 2，previousVersionId = null）
3. 再次更新溯源（version = 3）
4. 检查 `previousVersionId` 字段
5. **预期结果**：`previousVersionId` 保持为 `null`（不改变）

### 2.3 Citations 字段同步测试

**测试用例 1：更新引用**
1. 创建一个溯源，包含 3 个引用
2. 更新溯源，修改引用（删除 1 个，添加 1 个，修改 1 个）
3. 检查 `Trace.citations` (JSON) 和 `citationsList` (关系)
4. **预期结果**：两个字段内容一致，引用数量、顺序、内容都匹配

**测试用例 2：只更新其他字段**
1. 创建一个溯源，包含引用
2. 更新溯源，只修改 `title`，不修改 `citations`
3. 检查 `Trace.citations` (JSON) 和 `citationsList` (关系)
4. **预期结果**：两个字段保持不变，内容一致

---

## 三、回退方案

如果修复后出现问题，可以按以下步骤回退：

### 3.1 回退批准前检查

```typescript
// 在 apps/web/lib/processing/entryOperations.ts 中
// 删除或注释掉以下代码：
// if (!trace.analysis) {
//     throw new Error('溯源尚未完成AI分析，无法批准');
// }
// if (!trace.analysis.canApprove) {
//     throw new Error(...);
// }
```

### 3.2 回退版本历史修复

```typescript
// 在 apps/web/lib/processing/traceOperations.ts 中
// 恢复为：
// previousVersionId: traceId // 记录上一版本
```

### 3.3 回退 Citations 同步

```typescript
// 在 apps/web/lib/processing/traceOperations.ts 中
// 恢复为原来的逻辑，不生成 citationsJson
```

---

## 四、已知限制

### 4.1 版本历史功能限制

由于版本号递增但ID不变，`previousVersionId` 无法真正指向"上一版本"。如果需要完整的版本历史功能，建议：

1. **方案 A**：每次更新创建新记录（新ID），`previousVersionId` 指向旧记录的ID
2. **方案 B**：使用版本号而不是 `previousVersionId` 来追踪版本历史
3. **方案 C**：添加版本历史表，记录每次更新的快照

### 4.2 Citations 字段冗余

`Trace.citations` (JSON) 和 `citationsList` (关系) 同时存在，虽然已添加同步逻辑，但长期建议：

1. **方案 A**：移除 JSON 字段，只使用关系字段（需要修改所有读取 citations 的代码）
2. **方案 B**：移除关系字段，只使用 JSON 字段（失去关系查询的优势）
3. **方案 C**：保持现状，但确保所有更新操作都同步两个字段

---

## 五、后续优化建议

1. **添加单元测试**：为修复的功能添加单元测试
2. **添加集成测试**：测试完整流程（创建 → 发布 → 分析 → 批准）
3. **改进版本历史**：考虑重新设计版本历史系统
4. **移除字段冗余**：长期考虑移除 Citations 字段冗余

---

## 六、修复验证

修复完成后，请验证：

- [x] 批准前检查可信度
- [x] 版本历史记录逻辑
- [x] Citations 字段同步
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 生产环境验证

---

**修复完成时间**：2025-12-21  
**下一步行动**：运行测试，验证修复效果





