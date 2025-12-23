# 重置游戏状态指南

## 方法1：使用重置脚本（推荐）

```bash
# 重置今天的游戏
pnpm --filter @linklore/web baike:reset

# 重置指定日期的游戏
pnpm --filter @linklore/web baike:reset 20251219
```

## 方法2：清除浏览器本地存储

### Chrome/Edge
1. 按 `F12` 打开开发者工具
2. 点击 `Application` 标签（或 `存储`）
3. 左侧选择 `Local Storage` → 你的网站域名
4. 找到 `baike_game_state` 并删除

### 或者使用控制台
在浏览器控制台（Console）中执行：
```javascript
localStorage.removeItem('baike_game_state')
```

### Firefox
1. 按 `F12` 打开开发者工具
2. 点击 `存储` 标签
3. 展开 `本地存储` → 你的网站域名
4. 找到 `baike_game_state` 并删除

## 方法3：删除题目并重新获取

```bash
# 删除今天的题目
pnpm --filter @linklore/web baike:delete

# 重新获取题目
pnpm --filter @linklore/web baike:update
```

## 完整重置步骤

1. **清除数据库记录**：
   ```bash
   pnpm --filter @linklore/web baike:reset
   ```

2. **清除浏览器本地存储**：
   - 打开开发者工具（F12）
   - 在控制台执行：`localStorage.removeItem('baike_game_state')`

3. **刷新页面**：
   - 刷新游戏页面，会重新加载新的题目

## 注意事项

- 重置脚本会删除数据库中的游戏记录
- 本地存储需要手动清除（浏览器端操作）
- 如果删除了题目，需要重新运行 `baike:update` 获取新题目





