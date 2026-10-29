# Admin Page Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.
>
> 本次由当前会话直接执行用户已授权的定制。会话约束优先：不派发子代理，不再请求执行方式确认；上述子技能未安装，使用现有工具按下列步骤实施。

**Goal:** 在当前 v0.64.3 定制版本完成用户列出的管理员页面文案、链接和菜单调整，并部署验证。

**Architecture:** 修改各管理员组件的呈现逻辑，保留路由、设置数据和后端 API。共享数据库表单仅对 admin/full-page 位置隐藏帮助链接。新增文案通过 ttag 和中文翻译提供。

**Tech Stack:** React、TypeScript、ttag、Jest、OSS JAR、现有 Docker Compose / PostgreSQL 17。

## Global Constraints

- 保留 v0.64.3、新版原生 AI、现有中文默认、品牌、图表定制、Keycloak SSO。
- 不修改功能开关、权限、数据库内容、现有 HTTP/端口/密钥/挂载或其他应用。
- 菜单隐藏不代表撤销路由访问权限。
- 不读取或输出私有凭据；服务器仅限 uhooai / 122.224.218.82:9622。

---

### Task 1: 管理员显示内容

**Files:**
- Modify: `frontend/src/metabase/admin/settings/components/SettingsPages/GeneralSettingsPage.tsx`：站点名称和人性化说明显式覆盖。
- Modify: `locales/zh-CN.po`：对应两条中文翻译及无链接说明的翻译。
- Modify: `frontend/src/metabase/admin/settings/components/SettingsPages/DomainsSettingsPage.tsx`：所有“了解更多”链接去除，保留说明及 CSP 保存逻辑。
- Modify: `frontend/src/metabase/admin/settings/components/SettingsNav/SettingsNav.tsx`：不渲染 UpdatesNavItem 和 CustomVisualizationsNav。
- Modify: `frontend/src/metabase/admin/settings/components/SettingsPages/LocalizationSettingsPage.tsx`：不渲染 CommunityLocalizationNotice。
- Modify: `frontend/src/metabase/admin/databases/containers/DatabasePage.tsx`：移除帮助入口和因此失效的侧栏状态。
- Modify: `frontend/src/metabase/databases/components/DatabaseForm/DatabaseFormFooter.tsx`：admin/full-page 不渲染连接帮助。
- Modify: `frontend/src/metabase/admin/embedding/components/EmbeddingNav.tsx`：不渲染 Themes 菜单。
- Modify: `frontend/src/metabase/embedding/settings/EmbeddingSecuritySettings/EmbeddingAppSameSiteCookieDescription.tsx`：移除了解更多链接。
- Modify: `frontend/src/metabase/admin/ai/McpAppsSettings.tsx`、`AISettingsPage.tsx`：MCP/Agent API 说明保留，去掉链接。
- Modify: `frontend/src/metabase/admin/help/Help.tsx`：移除获取帮助、报告问题卡片及因此失效的 URL 构造；保留诊断和连接池详情。

**Interfaces:** 保留原组件导出、路由和所有设置更新函数签名。

- [x] 使用以下文案及限制实现显示调整：

```tsx
description={t`The name used for this instance.`}
description={t`To make table and field names more human-friendly, the system will replace dashes and underscores in them with spaces. We’ll capitalize each word while at it, so ‘last_visited_at’ will become ‘Last Visited At’.`}
// DatabaseFormFooter：设置向导和连接弹窗的行为保持不变。
isNew && location !== "full-page" && location !== "admin"
```

中文分别为“此实例使用的名称。”及原中文说明中的“Metabase”替换为“系统”。对移除链接后新产生的完整英文 msgid 补充相应中文翻译，避免中文页面回退英文。

- [x] 调整已有 SettingsNav、EmbeddingNav、DatabasePage、McpAppsSettings、AISettingsPage 测试的旧显示预期；不新增重复实现的测试。
- [x] 运行上述套件及 GeneralSettingsPage、DomainsSettingsPage、LocalizationSettingsPage、DatabaseForm 原有测试，确认仍可保存设置/连接表单/MCP 开关。
- [x] 运行修改文件 ESLint/Prettier、TypeScript 检查、`git diff --check`，提交本地 Git。

### Task 2: 构建和部署

**Files:** 当前源文件、`target/` 和服务端独立发布目录；完整现有 Compose 仅替换镜像行。

**Interfaces:** 新 JAR 携带 v0.64.3 和 Task 1 提交 hash；数据库 schema 不变。

- [x] 使用已配置 Java 25 / Bun / Clojure 构建 OSS JAR，校验 ZIP、版本、SHA256。
- [x] 复核正式容器镜像及主机，上传 JAR，比较远端摘要；保存现有完整 Compose 和数据库备份。
- [x] 从现有镜像替换 JAR 创建新镜像，仅重建 Metabase 服务，不重建 PostgreSQL。
- [x] 健康与启动日志通过，外网版本/hash、数据对象数及定义摘要保持一致。

### Task 3: 浏览器验收和记录

**Files:** `docs/customization/` 新验收记录；截图保存到忽略目录 `output/playwright/`。

**Interfaces:** 当前已登录管理员浏览器，不读取 Cookie 或凭据。

- [x] 按用户 1–9 项访问对应管理员页面核验文案、菜单和链接，保留截图。
- [x] 验证仪表板和管理员会话；不将既有门户 iframe 空白算成本次修复。
- [x] 记录制品、镜像、备份、回退方式和未验收边界，提交本地 Git并确认工作区干净。
