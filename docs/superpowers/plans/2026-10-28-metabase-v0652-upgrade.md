# Metabase v0.65.2 Custom Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.
>
> 本次遵循当前会话约束，直接在当前会话执行，不派发子代理、不重复请求执行许可。上述子技能未安装，使用已有 Git、构建和测试工具逐项完成。

**Goal:** 将本地 v0.64.3 / 6bd491e 定制程序迁移至官方 v0.65.2，并交付可验证的本地源码和 OSS JAR。

**Architecture:** 以官方 v0.65.2 标签创建新分支，用 v0.64.3 官方版本作为三方补丁基线迁移定制。旧定制分支和源码提交完整保留。按定制文件与上游改动交集解决冲突，保持原生 AI 目录和官方数据库迁移完整；新增嵌入管理结构按功能映射保留已有显示定制。

**Tech Stack:** Clojure、React、TypeScript、ttag、Bun、Java 25、H2、OSS uberjar、回环 OIDC fixture。

## Global Constraints

- 用户范围为本地升级；不连接、部署或修改任何服务器，不推送远程 Git。
- 产品起点为 `6bd491ebd0d0a6fe2bf3a1014872173abece0804`；当前 HEAD `795c137d` 与该提交之间只有部署脚本/文档，产品代码无差异。
- 官方目标 `v0.65.2`，标签 SHA `86e10edfb72a553851c39ef73f53b5c0f09a38b3`。
- 保留中文默认、AI问数导航、品牌/Logo/登录背景、推广入口隐藏、趋势和进度条样式、OSS Keycloak、2026-10-25 管理员页面定制。
- 新版原生 AI 和会话历史保持官方；不添加旧 Qwen 或旧历史补丁，不改变许可和权限判断。
- 原目录名保持 `metabase-v0.64.2.5`，避免破坏路径；旧分支和 JAR 保留。
- 测试数据和密钥为回环测试专用，保存在忽略的 target 目录，禁止继承生产 MB_* 配置。

---

### Task 1: 基线与差异审查

**Files:**
- Create: `target/v652-upgrade/source-audit.json`（忽略的审计数据）。
- Preserve: `target/releases/v0.64.3-6bd491e/metabase.jar` 和 SHA256 文件。
- Reference: `docs/customization/UHOOAI_V64_MIGRATION.md`、`UHOOAI_ADMIN_UI_20261025.md`。

**Interfaces:** 官方和定制 Git tree；用于后续合并的路径交集与重命名结果。

- [x] 核对工作区干净、官方标签、当前产品基线、磁盘和工具链；保存旧 JAR。
- [x] 使用旧 JAR 建立专用合成库，保存 3 个可见用户、47 个问题、8 个定制仪表板卡片及显式 SSO 绑定的 API 快照；清洁停止后复制 H2 文件。
- [x] 拉取标签，执行以下差异审查并保存结果（官方 6925 个改动路径，旧定制 137 个路径，交集 42 个）：

```sh
git diff --name-status --find-renames v0.64.3 v0.65.2
git diff --name-only v0.64.3 6bd491e
git diff --stat v0.64.3 v0.65.2
```

### Task 2: 本地合并和定制迁移

**Files:** 定制清单与上游交集中的现有文件；重点包括：
- `frontend/src/metabase/admin/settings/components/SettingsNav/SettingsNav.tsx`、SettingsPages 和 `locales/zh-CN.po`。
- `frontend/src/metabase/admin/ai/AISettingsPage.tsx`、`McpAppsSettings.tsx`、数据库表单和帮助页。
- 原 `frontend/src/metabase/admin/embedding/` 与官方 v65 的嵌入管理目录，通过上一步重命名/目录审查建立对应关系。
- `frontend/src/metabase/nav/`、`visualizations/visualizations/SmartScalar/`、`Progress/`、品牌和翻译构建组件。
- `src/metabase/sso/keycloak/`、`sso/api/keycloak.clj`、`server/middleware/` 和定制 Keycloak changeset。

**Interfaces:** 保留新版组件导出和原生 API；定制仍使用原 Keycloak 环境键、绑定表、PKCE 和会话校验。

- [x] 创建升级分支并合并：

```sh
git diff --binary --full-index v0.64.3 795c137d > target/v652-upgrade/custom-v643.patch
git switch -c customization/uhooai-v0.65.2 v0.65.2
git apply --3way target/v652-upgrade/custom-v643-adapted.patch
git diff --name-only --diff-filter=U
```

- [x] 逐个处理冲突：保留上游 v65 的结构/新能力，把已有显示行为移到对应组件；删除仅因本次合并而失效的导入、调用和测试预期，不整体采用旧目录覆盖新版。
- [x] 对新 Embedding Hub 导航审查“主题/外观”入口、SameSite 文档链接，以及新增推广位置；仅延续既有定制范围。
- [x] 调整现有回归测试以对应新路径；原生 AI 目录与官方目标比较无定制差异，原生迁移不修改。
- [x] 运行定向格式/静态检查，记录合并决策并提交源码，供 JAR 写入真实 Git hash。

### Task 3: 回归和构建

**Files:** 相关现有 `.unit.spec.tsx`、Keycloak/会话/设置/i18n 后端测试；`target/v652-upgrade/` 日志。

**Interfaces:** 已提交源码、目标依赖和包内版本。

- [x] 按目标 lockfile 安装依赖并检查工具版本；运行受影响管理员、导航、品牌、图表和数据库表单测试。
- [x] 运行 TypeScript 和定向 ESLint；运行回环 H2 的 Keycloak、会话、安全和翻译/品牌后端测试；失败时按具体原因修正，不扩展无关范围。
- [x] 执行正式 OSS 构建并校验：

```sh
./bin/build.sh '{:edition :oss :version "v0.65.2" :steps [:version :translations :frontend :licenses :python :uberjar]}'
```

要求：所有步骤成功，ZIP 条目校验通过，`version.properties` 为 v0.65.2 与本次源码 hash，计算 SHA256，确认没有 Enterprise 后端。

### Task 4: 本地迁移、浏览器与交付

**Files:** `target/v652-upgrade/fixture-db/`、`before.json`、`after.json`；`output/playwright/v652-upgrade/`；新 `docs/customization/` 升级记录。

**Interfaces:** 使用旧版合成库和原测试密钥启动新版 JAR；固定回环 gateway / IdP，不访问真实 Keycloak。

- [x] 新版迁移旧 H2 合成库，API 比较用户、问题定义、仪表板卡片、站点配置和绑定；保留旧快照以便回查。
- [x] 浏览器检查中文/品牌、管理员指定隐藏内容、新嵌入管理、趋势/进度样式和受控 SSO。记录测试替身边界，不称真实服务器验收。
- [x] 保存截图、安装包路径、SHA256、变更映射和未验证边界；停止本次回环服务，提交交付文档并确认工作区干净。

## 实际迁移映射

- 补丁先排除新版已删除的 EmbeddingNav/测试、UpsellSdkLink、AppBarLogo.styled；SameSite 描述迁移至 `embedding/settings`，auth wrapper 迁移至 `sso/auth_wrapper`。
- 新版 AppBar 的 CSS module 和原生导航间距保留，文字品牌与收窄宽度迁入新组件。
- 新 Embedding Hub 的“外观”导航隐藏；未授权的商业导航和新商业横幅隐藏，原路由、许可判断及付费功能保持官方。
- 数据库新版“测试连接”保留，只隐藏原来要求移除的帮助入口。
- 新版 server 不再依赖 sso；同源嵌入开关直接读取注册设置，Keycloak 校验通过 session 模块 API 接入，并保留原生 `session-key-hash`。
- 依赖首次下载截断后重试成功；Node 使用官方 SHA256 验证的 v22.23.4，Bun frozen lockfile 未变更。安全测试专用环境允许地图域名，避免测试恢复设置时受本机 DNS 影响；未修改产品策略。

- 浏览器补审：新嵌入引导页及嵌入方式卡片存在未进入官方 PO 的品牌文案；改为通用说明并补简体中文。隐藏新引导页中未授权的高级步骤、主题创建入口及营销 Demo，保留实际可用的 AI 配置、基础嵌入与技术文档链接；功能许可及条款判断保持原生。
