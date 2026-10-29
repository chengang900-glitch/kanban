# UhooAI v0.64.2.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 在独立本地 Git 仓库完成已确认的 v64 定制和可复现隔离验收。

**Architecture:** 以官方 43a24f64f0e522aaeb6f3b2cf39001c6e451bc56 为基线，选择旧版行为做三方迁移。品牌、导航和图表为展示层；Keycloak 使用独立 OSS 扩展并与新版认证中间件合并。

**Tech Stack:** Clojure、TypeScript、React、CSS Modules、Bun、Node 22、Java 25、H2/PostgreSQL。

## Global Constraints

- 根目录：/Users/chengang/Documents/UhooAI服务器/metabase-v0.64.2.5。
- 参考：/Users/chengang/Documents/metabase/metabase-v0.63.19，HEAD 7521b2d0；旧目录只读。
- 不迁移 src/metabase/llm、src/metabase/metabot、原生 AI 协议/工具/历史/state 补丁；AI 页面允许纯品牌和推广修改。
- 不覆盖 locales 原始词库，不覆盖官方 migration，不解锁 EE 特性，不改用户权限和生产数据。
- 仅本地提交；凭据、依赖、构建及测试数据不入库。构建空间不足时优先使用 APFS 克隆和既有缓存，不清理无关文件。

## Task 1: 独立仓库与迁移审计

- [x] 核对官方 tag SHA，新建 customization/uhooai-v0.64.2.5 分支，移除指向旧目录的可写 remote。
- [x] 保存旧官方/旧定制/新官方三方路径清单，逐项标记纳入、原生替代和排除；按实际旧差异生成主题补丁。
- [x] 提交本设计和计划。

验证命令：`git rev-parse v0.64.2.5`、`git status --short`、`git fsck --connectivity-only --no-dangling`。

## Task 2: 品牌与中文默认值

路径：bin/build/src/i18n/create_artifacts{,/frontend,/backend}.clj、src/metabase/util/i18n{,/impl}.clj、src/metabase/system/settings.clj、src/metabase/server/routes/index.clj；frontend/src/metabase/{api/localization.ts,utils/branding.ts,auth/components/AuthLayout,nav/components/AppBar,nav/components/AdminNavbar,plugins/oss/core.ts,setup/utils.ts}；登录背景与现有 favicon。

- [x] 合并旧版站点名、背景和语言默认行为，保留新版组件接口和翻译校验。
- [x] 品牌变换只处理翻译模板中的产品名，禁止改格式化参数、用户内容、URL 和版权文本；不沿用旧邮件中固定中文主题。
- [x] 增加站点名空值/默认值/长名测试；验证中文默认值及英文用户覆盖；验证模板参数保留。
- [x] 执行目标前端测试、翻译构建、后端 i18n/settings/routes 定向测试，通过后提交。

命令：`bun run build:cljs`；`node node_modules/jest/bin/jest.js --runInBand --runTestsByPath frontend/src/metabase/utils/branding.unit.spec.ts frontend/src/metabase/auth/components/AuthLayout/AuthLayout.unit.spec.tsx frontend/src/metabase/nav/components/AdminNavbar/AdminNavbar.unit.spec.tsx frontend/src/metabase/setup/utils.unit.spec.ts`；`./bin/test-agent :only '[metabase.util.i18n-test metabase.system.settings-test metabase.server.routes.index-test]'`。实际路径和退出结果写入迁移记录。

## Task 3: 商业推广和 AI问数导航

路径：frontend/src/metabase/common/components/{upsells,AppBanner}、admin/{upsells,settings/components/SettingsNav}、nav/{components,containers/MainNavbar}、data-studio/app/pages/DataStudioLayout；AI 页面仅处理独立推广组件。

- [x] 将共享推广、独立商业卡片和购买菜单隐藏，保留原生配置与许可判定。
- [x] 新版 SettingsNav 与 AppBanner 手工合并；保留 Google/LDAP/原生可视化、Monitor 及安全、只读、错误警告。
- [x] 新增 AI问数链接，复用 `Urls.newQuestion({ mode: "ask" })` 和原生 `startNewConversation({ agentId: "ask" })`；按 NLQ 与数据权限显示。
- [x] 验证共享和独立推广均消失、配置操作不受影响、无权限不显示入口；通过后提交。

## Task 4: 图表

路径：frontend/src/metabase/dashboard/components/DashCard/{DashCard.tsx,DashCard.module.css}、visualizations/visualizations/{Progress/Progress.tsx,SmartScalar/SmartScalar.tsx}。

- [x] 迁移主应用卡片限定样式和 progress 配置色 CSS 变量。
- [x] 在新版 ScalarCardShell 中增加基于比较结果的强调色，不覆盖新版布局和计算。
- [x] 检查小进度百分比不撑大完成段；保留隐藏背景及公开/SDK 嵌入边界。
- [x] 执行 Progress、SmartScalar、DashCard 定向测试，通过后提交。

## Task 5: Keycloak OSS

路径：src/metabase/sso/{api/keycloak.clj,keycloak,models/keycloak.clj,core.clj,init.clj}、src/metabase/server/{auth_wrapper.clj,middleware/session.clj,middleware/security.clj}、resources/migrations/063/20261003_oss_keycloak.yaml、对应 test/metabase/sso/keycloak 测试；登录组件和公开配置类型。

- [x] 移植独立旧版扩展和已验证邮箱首次绑定；用三方合并保留新版认证修复。
- [x] 审查 migration 扫描规则与既有 changeset 标识，兼容新库与已存在扩展的旧库，官方 changeset 不变。
- [x] 保留 PKCE/state/nonce、issuer+sub、邮件严格验证、个人会话、签名退出与重放拒绝。
- [x] 隔离运行 protocol/store/integration、session/security、模块依赖和登录组件测试；通过后提交。

命令：`bin/keycloak-portal/test-local.sh`；加载对应命名空间并预初始化 loopback web-server 后执行原生 session/security/modules 回归。测试只使用隔离 H2，不继承 MB_DB_* 环境。

## Task 6: 构建与交付

- [x] 对全部改动跑类型、格式、定向 lint 和 `git diff --check`，验证 AI 后端和历史与官方一致。
- [x] 使用 `./bin/build.sh '{:edition :oss :version "v0.64.2.5" :steps [:version :translations :frontend :licenses :python :uberjar]}'` 构建。
- [x] `unzip -tq target/uberjar/metabase.jar`、内部 version.properties、SHA-256，验证无 EE 后端类。
- [x] 独立 loopback H2 实例的实际浏览器品牌/图表和模拟 OIDC 流程通过。
- [ ] PostgreSQL 17.11 生产应用库备份的隔离恢复及迁移：留待生产接入阶段，不作为本轮已通过项目。
- [x] 记录真实 Keycloak/门户、生产数据库副本和业务验收的实际边界；不得用模拟或健康接口代替真实验收。
- [x] 更新迁移记录、Git 提交、制品与复现命令并交付；不推送、不切换生产。
