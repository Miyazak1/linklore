# LinkLore — 变更索引（AI 维护）

## 2025-11-12  初始化项目骨架与基础设施文件
- 新增：根 `package.json`（monorepo workspaces）
- 新增：`infrastructure/nginx/nginx.conf`（反向代理与安全头）
- 新增：`infrastructure/scripts/bootstrap-alinux.sh`（Alibaba Cloud Linux 初始化脚本）
- 新增：`apps/web/`（Next.js 基础骨架与占位页）
- 新增：`packages/core-ai/`（AI 抽象层占位）
- 新增：`worker/ai-queue/`（队列占位）
- 新增：`prisma/schema.prisma`（初始数据模型）

回退：删除上述文件或 `git revert` 本次提交











