# LinkLore — 变更索引（AI 维护）

## 2025-01-XX  修复聊天页面左侧栏切换聊天时自动跳转回最新房间的问题

**版本**: v1.0.1  
**测试用例编号**: TC-2025-001

### 变更文件
- `/apps/web/app/(main)/chat/page.tsx` (修改)

### 问题描述
用户在聊天页面左侧栏切换其他聊天时，每次切换后都会自动跳转回最新的聊天，无法停留在用户选择的聊天上。

### 实现方案
1. **添加用户选择标记**：新增 `isUserSelectingRef` 来标记用户是否正在主动选择房间，避免自动加载逻辑覆盖用户选择。
2. **优化URL参数检测**：新增 `lastRoomIdRef` 来记录上次的房间ID，准确检测URL参数变化，区分用户主动切换和自动加载。
3. **修改切换逻辑**：在 `handleRoomSelect` 中设置用户选择标记，确保用户主动切换时不会被自动加载覆盖。
4. **优化useEffect逻辑**：
   - 当检测到用户正在选择房间时，只更新 `currentRoomId` 和URL，不触发自动加载
   - 当URL参数从有值变成有值时（切换房间），只更新状态，不重新初始化
5. **保护loadOrCreateRoom**：在 `loadOrCreateRoom` 函数中检查用户选择标记，如果用户正在选择，不执行自动加载。

### 技术细节
- 使用 `useRef` 来保存状态，避免触发不必要的重新渲染
- 通过比较 `lastRoomIdRef.current` 和 `roomIdFromUrl` 来准确检测URL参数变化
- 在用户选择完成后及时重置 `isUserSelectingRef.current = false`

### 测试步骤
1. 打开聊天页面，确保有至少2个聊天记录
2. 点击左侧栏的任意一个聊天（不是最新的那个）
3. **预期结果**：页面应该切换到用户点击的聊天，并停留在该聊天，不会自动跳转回最新聊天
4. 再次点击左侧栏的另一个聊天
5. **预期结果**：页面应该切换到新点击的聊天，并停留在该聊天
6. 刷新页面，URL中带有 `?room=某个聊天ID`
7. **预期结果**：页面应该加载URL中指定的聊天，而不是自动跳转到最新聊天

### 回退命令
```bash
git checkout -- apps/web/app/(main)/chat/page.tsx
```

### 已知问题/限制
无

---

## 2025-11-12  初始化项目骨架与基础设施文件
- 新增：根 `package.json`（monorepo workspaces）
- 新增：`infrastructure/nginx/nginx.conf`（反向代理与安全头）
- 新增：`infrastructure/scripts/bootstrap-alinux.sh`（Alibaba Cloud Linux 初始化脚本）
- 新增：`apps/web/`（Next.js 基础骨架与占位页）
- 新增：`packages/core-ai/`（AI 抽象层占位）
- 新增：`worker/ai-queue/`（队列占位）
- 新增：`prisma/schema.prisma`（初始数据模型）

回退：删除上述文件或 `git revert` 本次提交











