# UhooAI 数据看板：完整定制与升级说明（v0.65.2）

文档日期：2026-10-29。适用交付包：**Metabase OSS v0.65.2 / f8047ea**。

本文汇总从 v0.63.19 参考定制迁移至 v0.64.2.5、v0.64.3，再升级至 v0.65.2 的方案、现行定制、实现位置、验证结果与后续部署方法。它是当前定制版的总说明；阶段性记录和机器可读结果作为证据保留。

**交付状态：本地源码、安装包和隔离验收已完成，源码已发布至 GitHub；本轮没有把 v0.65.2 部署到任何服务器，也没有执行生产数据迁移。** 本次说明文件更新不改变已生成安装包的版本和校验值。

## 目录

1. [版本、源码和安装包](#1-版本源码和安装包)
2. [定制方案与迁移原则](#2-定制方案与迁移原则)
3. [完整定制清单](#3-完整定制清单)
4. [源码实现位置](#4-源码实现位置)
5. [本地构建与复验](#5-本地构建与复验)
6. [已完成的验证和证据](#6-已完成的验证和证据)
7. [服务器升级实施方案](#7-服务器升级实施方案)
8. [回滚与数据保护](#8-回滚与数据保护)
9. [后续官方版本升级流程](#9-后续官方版本升级流程)
10. [GitHub 发布与维护](#10-github-发布与维护)
11. [已知限制与待验收事项](#11-已知限制与待验收事项)
12. [关联记录](#12-关联记录)

## 1. 版本、源码和安装包

### 1.1 版本沿革

| 阶段 | 版本与标识 | 用途/状态 |
| --- | --- | --- |
| 原定制参考 | v0.63.19 / `7521b2d0` | 作为历史定制行为参考，未整包覆盖到新版 |
| v0.64.2.5 官方基线 | `43a24f64f0e522aaeb6f3b2cf39001c6e451bc56` | 第一轮迁移基线 |
| v0.64.2.5 定制交付 | `a26b7ad` | 历史构建与部署记录保留 |
| v0.64.3 官方基线 | `dc449ac0214ca332a24a605335405db0352d6b5f` | 第二轮升级基线 |
| v0.64.3 管理员定制交付 | `6bd491e` | 包含第一组九项管理员页面定制；历史服务器部署版本见各环境记录 |
| v0.65.2 官方基线 | `86e10edfb72a553851c39ef73f53b5c0f09a38b3` | 本次官方目标版本 |
| v0.65.2 首次迁移交付 | `e134ef6` | 完成版本迁移、旧定制兼容和隔离数据迁移验收 |
| **v0.65.2 最新定制交付** | **`f8047ea`** | **增加 setup、帮助链接和“图表”中文术语定制；当前安装包** |

官方基线是此次指定目标，不表示本文编写时对官方“最新版本”的实时判断。

### 1.2 当前交付标识

| 项目 | 值 |
| --- | --- |
| 官方目标 | v0.65.2，OSS 构建 |
| 包内 `version.properties` | `tag=v0.65.2`、`hash=f8047ea`、`date=2026-10-29` |
| 产品源码提交 | `f8047ea8e04b90c5d3f5ad6eeb8759da08b7c494` |
| 本地开发分支 | `customization/uhooai-v0.65.2` |
| 本地项目目录 | `/Users/chengang/Documents/UhooAI服务器/metabase-v0.64.2.5`，目录名沿用历史名称 |
| 固定发布包（本机现名） | `target/releases/v0.65.2-f8047ea8/kanban.jar` |
| 当前构建输出 | `target/uberjar/metabase.jar`，会被后续构建覆盖 |
| JAR 大小 | 715,873,891 字节 |
| JAR SHA-256 | `4fb420b5e0e7632ccfbc07e23b367635c97201bae162788d3965ade4c08bc0fe` |
| ZIP 完整性 | 304,874 个条目 CRC 检查通过；不含 Enterprise 后端扩展 |
| 源码仓库 | [chengang900-glitch/kanban](https://github.com/chengang900-glitch/kanban) 的 `main` 分支 |

本机固定发布包现名为 `kanban.jar`，历史制品记录中的 `metabase.jar` 是原交付名；已核对现名文件与构建输出的 SHA-256 一致。文件名不改变包内版本。

后续仅补充文档的 Git 提交不会改变已经生成的 JAR。包内哈希、开发分支最新提交、GitHub 发布提交是不同标识，核对时应分别记录。

历史 `v0.65.2-e134ef6e` 发布包的验收 SHA-256 为 `26ef58bc04b39c75016d6772327752a3624829007459e6e0426ceb70a0c3b60e`；v0.64.3 / 6bd491e 的历史制品 SHA-256 为 `b2605d1d8c04b90c334c0c249d186d22ef6fcb56737be58185b9c9c115ffae61`。它们用于对应阶段的追溯，不能混作当前包；旧制品是否仍在、保存于何处，应按实际归档核查。

## 2. 定制方案与迁移原则

### 2.1 采用的方案

以目标官方版本为底座，逐项审查旧版定制，分别处理：

| 类型 | 处理方式 | 本次实例 |
| --- | --- | --- |
| 仍需保留 | 迁移到新版接口和组件，保留原行为边界 | 品牌、默认中文、AI问数导航、趋势图、进度条、OSS Keycloak |
| 上游已提供 | 使用新版原生功能，停止携带旧补丁 | 会话历史 |
| 暂不启用 | 不加入兼容层，避免改变新版核心行为 | Qwen 旧适配 |
| 结构变化较大 | 对新版重新定位、实现和验收 | Embedding Hub、认证模块、管理员推广和帮助入口 |

v0.64.3 → v0.65.2 采用三方差异迁移：比较“旧官方 → 旧定制”的差异，并结合“旧官方 → 新官方”的变化逐文件审查。认证、会话、安全、数据库迁移及许可判断优先保留目标版本实现，不用旧源码整体覆盖。

### 2.2 明确保留的边界

- 原生 AI/provider、工具、协议、提示词、会话历史和模型配置流程继续使用 v0.65.2 实现。
- 隐藏收费引导、菜单或帮助链接，不赋予付费权限，不删除后端许可检查，也不开放对应路由权限。
- 用户业务数据、图表名称、查询条件、权限、数据库连接和现有身份绑定不因品牌/翻译变更而重写。
- 官方数据库 changeset 不改；保留原有独立 Keycloak changeset 的 ID 和内容，避免已应用库重复执行。
- 凭据只由部署环境提供；私有配置、真实密钥、测试库、构建中间文件和 JAR 不纳入源码 Git。
- 原始许可证、版权、技术标识和真实 AI 服务商身份保留，具体许可材料见仓库根目录的 `LICENSE*.txt`。

## 3. 完整定制清单

### 3.1 中文、品牌和导航

| 项目 | 当前行为 | 保留内容 |
| --- | --- | --- |
| 默认语言 | 新实例站点和 setup 默认简体中文 `zh_CN` | 用户显式选择其他语言的能力 |
| 默认名称 | 中文默认“数据看板”，其他语言回退“Dashboard”；登录、主导航和后台使用配置的站点名 | 站点名原值、管理员写入权限；长名称仅布局裁切 |
| Logo/登录视觉 | 延续定制导航品牌、favicon 和登录背景 | 业务导航、页面布局和原生交互 |
| 品牌文案 | 翻译构建处理独立产品名；不替换 URL、参数、代码标识和用户内容 | 版权、许可证和真实服务商名称 |
| 邮件品牌 | 无配置时省略默认图标、使用站点名称、移除 Made with 推广；已配置图标保留 | 正文、业务链接和版权 |
| AI问数导航 | 左侧导航进入原生 `/question/ask`，调用原生对话流程 | NLQ、数据权限和原生历史 |
| 商业引导 | 隐藏共享 upsell、付费导航及营销入口；监控默认进入可用页面 | 实际许可错误、安全、只读及开发告警 |

### 3.2 趋势图与进度条

| 组件 | 定制表现 | 计算及显示边界 |
| --- | --- | --- |
| 趋势图 `SmartScalar` | 主应用卡片沿用定制视觉；按原生比较结果选择强调色，优先级为 error → success → brand 回退 | 保留新版 `ScalarCardShell`、比较计算、反向指标颜色含义、日期、布局和钻取 |
| 进度条 `Progress` | 主应用卡片内使用配置色的浅到深渐变，显示胶囊百分比；低比例进度不被徽标撑大 | 保留原生值/目标计算和状态文案；0、1、65、100、125、NULL 等场景已做隔离验证 |
| 隐藏卡片背景 | 不显示主应用定制渐变/徽标，恢复原生指针等表现 | 保留无背景布局 |
| 公开分享/嵌入 | 不将主应用卡片样式强加到公开分享和相关嵌入布局 | 按原生组件及当前许可边界显示 |

NULL 在已验收场景仍按原生逻辑显示为 0；本次没有重新定义空值业务含义。组件延续定制不表示把 v0.63.19 的组件整份复制回来。

### 3.3 Keycloak 单点登录与同源门户

使用独立维护的 OSS Keycloak 扩展，不冒用上游 Enterprise SSO 功能：

- 校验 PKCE S256、state、nonce、签名、issuer、audience 和令牌时效。
- 以稳定的 `issuer + sub` 关联身份，创建各用户自己的原生会话，不共享管理员会话。
- 首次邮箱自动绑定仅在已验证邮箱、唯一活跃已有账号且无身份冲突等条件满足时生效；不自动创建用户或提升权限。
- 管理员可通过受保护的绑定接口显式绑定；到期、解绑和 backchannel logout 能撤销关联会话。
- 同源完整工作区嵌入由显式开关控制，使用 `frame-ancestors 'self'` 和 `SAMEORIGIN` 边界；不开放任意跨域嵌入。

| 环境变量 | 用途 |
| --- | --- |
| `MB_OSS_KEYCLOAK_ENABLED` | 启用独立 OSS SSO，默认关闭 |
| `MB_OSS_KEYCLOAK_ISSUER` | 精确 Realm Issuer |
| `MB_OSS_KEYCLOAK_CLIENT_ID` | 客户端 ID |
| `MB_OSS_KEYCLOAK_CLIENT_SECRET` | 服务端客户端密钥，不能提交 Git 或输出到日志 |
| `MB_ENCRYPTION_SECRET_KEY` | 长期应用加密密钥，升级和恢复必须正确保留 |
| `MB_OSS_KEYCLOAK_PORTAL_PATH` | 固定同源门户回跳路径，默认 `/portal/data` |
| `MB_OSS_WORKSPACE_EMBEDDING_ENABLED` | 同源工作区嵌入，默认关闭 |
| `MB_SITE_URL` | 对外地址，包含实际协议、端口和 `/metabase` 前缀 |

对外 SSO 回调为 `<MB_SITE_URL>/auth/keycloak/callback`，backchannel 地址为 `<MB_SITE_URL>/auth/keycloak/backchannel-logout`。配置值按目标环境核对，不从另一台服务器复制。

已有明文应用库首次启用加密时，需要先在恢复副本上验证原生 `enable-encryption` 流程；不能只新增环境变量就直接启动，也不能丢弃原加密密钥。

### 3.4 第一组管理员页面九项定制

| 项目 | 当前方案 |
| --- | --- |
| 1. 设置 → 常规 | 名称说明为“此实例使用的名称。”；友好表名/字段名说明中的产品名改为“系统” |
| 2. 设置 → 域名 | 移除“了解更多”，保留域名、CSP 说明和保存行为 |
| 3. 设置 → 更新 | 隐藏菜单入口，保留原路由和权限边界 |
| 4. 设置 → 本地化 | 移除整段社区翻译提示和 Crowdin 链接，保留语言、时区和格式配置 |
| 5. 设置 → 自定义可视化 | 隐藏入口和开发子菜单 |
| 6. 管理员 → 数据库 | 隐藏“连接需要帮助？”及“需要帮忙吗？帮助在这里”；保留表单、同步、保存和新版测试连接 |
| 7. 嵌入管理 | 隐藏外观/主题入口、未授权商业导航与营销引导；移除指定安全说明中的“了解更多” |
| 8. 管理员 → AI → MCP | 移除 MCP 服务器和 Agent API 两处“了解更多”；保留开关、来源、客户端及地址配置 |
| 9. 管理员 → 帮助 | 移除“获取帮助”和“报告问题”卡片；保留诊断、复制和连接池详情 |

v0.65.2 已将嵌入配置重组为 Embedding Hub，以上要求已重新映射到新版结构；可用 AI 配置仍保留，许可和条款条件继续执行。

### 3.5 第二组 setup、帮助与术语九项定制

| 项目 | 最终行为 | 实现层 |
| --- | --- | --- |
| 1. setup 入门指南 | 整个“如果你卡住了……”指南页脚不渲染 | `SetupHelp` |
| 2. setup 姓名 | 姓在前、名在后；自托管初始焦点在姓；字段仍对应 `last_name` / `first_name` | `UserForm` |
| 3. setup 用途 | 第一项“为我自己的公司做自助式分析”固定选中；四项均禁用 | 组件、action、reducer |
| 4. setup 匿名采集 | 移除说明和文档链接；开关关闭且禁用；新安装默认值和初始化写入值均为 false | 组件、客户端状态/提交、后端设置和 setup API |
| 5. 完成页版本邮件 | 开关关闭且禁用，进入应用不调用订阅函数 | `CompletedStep` |
| 6. 设置 → 地图 | 移除“了解更多”，保留切片 URL、安全提示和自定义地图能力 | 公共链接策略 |
| 7. 嵌入管理 Useful links | 移除标题及 Embedding methods、Documentation 两张卡 | 入门页组件 |
| 8. 权限及其他帮助 | 数据、集合、应用权限帮助移除文档页脚；其他“了解更多”链接按统一规则隐藏 | 公共 `ExternalLink` 与非公共链接实现 |
| 9. Question 对象名称 | 已有简体中文对象译文改为“图表”，共调整 271 条 | `locales/zh-CN.po` |

#### 锁定与链接的准确含义

- 匿名采集和用途不只是呈现一个灰色开关：初始状态、旧调用传入值及最终初始化写入均有对应处理。
- 匿名采集锁定范围是 **setup**；没有迁移已有实例的已存设置，也没有删除管理员后续设置权限。部署时需核对显式环境变量是否与预期一致。
- 邮件订阅保留关闭状态的 UI，完成页不再发订阅请求；没有修改用户已有的其他邮件订阅业务。
- “了解更多”规则覆盖英文 Learn more（大小写、句号、扩展标题）和对应简体中文标签，并检查嵌套文字。原始翻译词条可以保留，实际链接不渲染。
- 普通功能链接、法律信息和其他标题的链接不按此规则删除；SDK CLI、README 等开发材料也不属于网页帮助入口。

#### 翻译语义

| 原含义/文案 | 当前中文 |
| --- | --- |
| `Question`：已保存的查询/图表对象 | 图表 |
| 新建及保存对象 | 新建图表、保存新图表 |
| `Replace or save as new?` | 替换还是另存为新图表？ |
| `There was a problem with your question` | 你的图表出现问题 |
| `There was a problem with this question.` | 此图表出现了问题。 |
| AI 的自然语言问题 | 保留“提问”等普通问句含义 |
| 故障、疑问与 API 标识 | 保留“问题”语义和 `question` 等字面量 |

审查包含 279 条 question 相关条目及其余包含“问题”的中文译文；最终调整 271 条。英文 msgid、上下文、复数定义、参数占位符顺序、代码变量、API 路径、URI、数据库字段及用户自己命名的内容不变。

## 4. 源码实现位置

以下路径相对仓库根目录，供下次迁移定位；表格列出主要入口，不代替完整 Git diff。

| 领域 | 主要位置 |
| --- | --- |
| 品牌/本地化 | `frontend/src/metabase/utils/branding.ts`、`frontend/src/metabase/utils/localization.ts`、`frontend/src/metabase/nav/components/AppBar/`、`frontend/src/metabase/auth/components/`、`src/metabase/appearance/settings.clj`、`src/metabase/system/settings.clj` |
| 翻译构建 | `bin/build/src/i18n/create_artifacts.clj`、`bin/build/src/i18n/create_artifacts/frontend.clj`、`bin/build/src/i18n/create_artifacts/backend.clj`、`locales/zh-CN.po` |
| 品牌图片/图标 | `resources/frontend_client/app/assets/img/`、`resources/frontend_client/favicon.ico` |
| 邮件 | `src/metabase/channel/email/`、`src/metabase/notification/payload/core.clj` |
| 商业/导航 | `frontend/src/metabase/common/components/upsells/`、`frontend/src/metabase/nav/`、`frontend/src/metabase/plugins/oss/core.ts`、`frontend/src/metabase/monitor/routes.tsx` |
| 趋势/进度条 | `frontend/src/metabase/visualizations/visualizations/SmartScalar/`、`frontend/src/metabase/visualizations/visualizations/Progress/`、`frontend/src/metabase/dashboard/components/DashCard/` |
| 管理页面 | `frontend/src/metabase/admin/settings/`、`frontend/src/metabase/admin/databases/`、`frontend/src/metabase/admin/ai/`、`frontend/src/metabase/admin/help/` |
| 初始化流程 | `frontend/src/metabase/setup/components/`、`frontend/src/metabase/setup/actions.ts`、`frontend/src/metabase/setup/reducers.ts`、`src/metabase/setup_rest/api.clj` |
| 匿名采集默认值 | `src/metabase/analytics/settings.clj` |
| 公共帮助链接 | `frontend/src/metabase/common/components/ExternalLink/ExternalLink.tsx` |
| 权限说明 | `frontend/src/metabase/permissions/components/`、`frontend/src/metabase/admin/permissions/components/PermissionsEditor/` |
| 嵌入入口 | `frontend/src/metabase/embedding-hub/`、`frontend/src/metabase/embedding/settings/` |
| OSS SSO | `src/metabase/sso/api/keycloak.clj`、`src/metabase/sso/keycloak/`、`src/metabase/sso/auth_wrapper.clj`、`src/metabase/sso/models/keycloak.clj` |
| 会话/同源框架 | `src/metabase/session/core.clj`、`src/metabase/server/middleware/session.clj`、`src/metabase/server/middleware/security.clj` |
| 独立迁移 | `resources/migrations/063/20261003_oss_keycloak.yaml` |
| 隔离测试辅助 | `bin/keycloak-portal/`、`test/metabase/sso/keycloak/` |

v0.65.2 的 `server/auth_wrapper` 已迁入 SSO 模块；Web 层通过设置和 session 的公开 API 接入，保留新版 `session-key-hash` 与会话流程。AppBar 改用 CSS module；定制宽度、内边距和文字品牌已迁到新版组件。

## 5. 本地构建与复验

### 5.1 环境和源码

本次实际工具链包括 Java Temurin 25.0.3、Node 22.23.4、Bun 1.3.14、Clojure CLI、Babashka、uv 和 Python 3.12。以仓库 `mise.toml`、`.nvmrc`、`package.json` 及锁文件为准，勿为方便构建更新依赖锁文件。

```sh
git clone --single-branch --branch main https://github.com/chengang900-glitch/kanban.git
cd kanban
git status --short
git rev-parse HEAD
bun install --frozen-lockfile
```

上述是源码取得步骤，不代表已经配置好本机工具链。GitHub main 是保留既有远端历史的源码发布快照；从 main 新构建时包内 hash 使用实际构建提交，日期也可能变化，不能要求重新构建的 JAR 与本次交付包字节完全相同。

### 5.2 构建

在工具链就绪、源码已提交后，首次完整 OSS 构建使用：

```sh
./bin/build.sh '{:edition :oss :version "v0.65.2" :steps [:version :translations :frontend :licenses :python :uberjar]}'
```

只有确认同一目标依赖的许可证及 Python 资源已完整生成、且这些依赖没有变化时，后续 UI/翻译修订才可使用：

```sh
./bin/build.sh '{:edition :oss :version "v0.65.2" :steps [:version :translations :frontend :uberjar]}'
```

不能在全新 checkout 上省略尚未生成的 licenses/python。当前包保留官方固定 sqlglot 30.20.0。内存受限时串行执行测试和构建；磁盘要同时容纳依赖、编译产物、旧发布包及新 JAR，不能仅按最终约 683 MiB 包大小估算。

### 5.3 定向检查

```sh
bun run build-pure:cljs
bun run type-check-pure
node_modules/.bin/jest --ignoreProjects ci-scripts --runInBand --runTestsByPath \
  frontend/src/metabase/common/components/ExternalLink/ExternalLink.unit.spec.tsx \
  frontend/src/metabase/setup/actions.unit.spec.ts \
  frontend/src/metabase/setup/tests/common.unit.spec.tsx \
  frontend/src/metabase/setup/components/UserStep/UserStep.unit.spec.tsx \
  frontend/src/metabase/setup/components/UsageQuestionStep/UsageQuestionStep.unit.spec.tsx \
  frontend/src/metabase/setup/components/DataUsageStep/DataUsageStep.unit.spec.tsx \
  frontend/src/metabase/setup/components/CompletedStep/CompletedStep.unit.spec.tsx \
  frontend/src/metabase/admin/settings/components/SettingsPages/MapsSettingsPage.unit.spec.tsx \
  frontend/src/metabase/permissions/components/DataPermissionsHelp/DataPermissionsHelp.unit.spec.tsx \
  frontend/src/metabase/embedding-hub/pages/GetStarted/EmbeddingHubGetStartedPage.unit.spec.tsx
bin/keycloak-portal/test-local.sh
git diff --check
```

这些是维护时的重点检查入口，不是全部历史测试数量的复现清单。后端默认采集值、setup API、翻译构建还应覆盖 `metabase.analytics.settings-test/anonymous-tracking-default-off-test`、`metabase.setup-rest.api-test`、`i18n.create-artifacts.frontend-test` 和 `i18n.create-artifacts.backend-test`；翻译测试需包含 `bin/build/src` 与 `bin/build/test` 的 classpath。

API 测试内部固定英文站点上下文以校验上游英文错误信息，不改变产品的中文默认值。测试用 H2 和独立环境，不继承生产数据库或真实 `MB_*` 配置。本次地图测试使用的 `MB_MAP_TILE_SERVER_ALLOWED_NETWORKS=allow-all` 仅限隔离进程，生产网络策略没有因此放宽。

### 5.4 安装包和实际页面

1. 校验 JAR 的 ZIP CRC、`version.properties`、SHA-256、OSS 内容，以及 Keycloak 扩展类/changeset。
2. 将制品复制到以版本和源码提交命名的固定发布目录；不要只保留会被重建覆盖的 `target/uberjar`。
3. 用独立全新库检查 setup；验证默认值时不要注入 `MB_SITE_LOCALE` 或 `MB_ANON_TRACKING_ENABLED` 来掩盖产品默认值。
4. 用真实浏览器检查字段顺序、焦点、禁用状态、点击/键盘操作、进入下一步后的实际状态及 API 存储值。
5. 完成管理员页面复查，并保存、运行一个示例图表。

`bin/keycloak-portal/isolated-server.mjs` 只监听回环地址，清除继承的 `MB_*` 并创建临时测试身份/密钥，用于 SSO 与同源框架检查；它显式关闭匿名采集，因此不能单独证明“未配置时默认关闭”。其 `seed-local.mjs` 会完成 setup 并设置测试语言，不能在新安装中文 setup 验收前先运行。重启测试程序会创建新库/密钥，不能当作持久化生产部署。

## 6. 已完成的验证和证据

以下区分首次 v0.65.2 迁移包与最终 UI 包；不同组存在重叠，不把数字相加成一个覆盖率结论。

| 阶段 | 已确认结果 | 范围 |
| --- | --- | --- |
| v0.65.2 首次迁移包 `e134ef6` | 前端 30 套件/421 项；后端核心 156 项/853 断言；认证/会话/安全/模块复查 136 项/9,039 断言 | 对应首次迁移记录及 JSON |
| 首次迁移包翻译 | 5 项/27 断言通过 | 对应 `e134ef6` 阶段 |
| 最终 UI 包定向前端 | 28 套件/120 项通过 | setup、链接、地图、权限、嵌入等 |
| 最终 UI 包补充回归 | 4 套件/28 项通过 | 含原生 AI 配置、选择器、工具及重叠 UserStep |
| 最终 UI 包后端及翻译 | 19 项/124 断言通过 | setup API、采集默认值、翻译 |
| 最后一条另存译文修订后 | 翻译 7 项/35 断言通过 | 另存提示及语义正反检查 |
| 静态质量 | TypeScript、定向 Oxlint、格式、提交钩子、`git diff --check` 通过 | 对应改动范围 |
| 最终 JAR | ZIP CRC、版本、SHA-256 和 OSS 内容通过 | `f8047ea` 实际包 |
| 最终实际页面 | 全新中文 setup 完成；姓/名字段映射正确；用途首项固定；采集与邮件锁定关闭；管理员/嵌入指定页面通过 | 独立合成 H2 实例，13 张本地截图 |
| 最终实际业务动作 | 新建并保存示例图表，查询返回前 2,000 行；公开属性确认采集 false | 不是真实业务库或 AI 模型验收 |

首次版本迁移演练使用旧 6bd491e JAR 创建合成 H2 库，停机备份后再用 v0.65.2 迁移：3 个可见用户、47 个历史 Question 对象、重点仪表板 8 张卡片、2 个显式 SSO 绑定及关键设置保持。查询定义比较只规范化已声明的内部 UUID 及其精确引用，未忽略业务条件；6 张进度卡和 2 张趋势卡未命中缓存查询均 completed，共返回 104 行。

首次迁移包还通过本地 RSA 签名 OIDC 替身检查 A/B 个人会话、切换、同源 iframe 和 backchannel 注销。最终 UI 包没有重复生产 Keycloak 或真实门户联调；不能把首次替身测试当作最终包的生产 SSO 验收。

- 首次迁移证据：[UHOOAI_V652_VERIFICATION.json](UHOOAI_V652_VERIFICATION.json)。
- 最终 UI/制品证据：[UHOOAI_V652_SETUP_UI_VERIFICATION.json](UHOOAI_V652_SETUP_UI_VERIFICATION.json)。
- 本机截图：`output/playwright/v652-upgrade/`、`output/playwright/ui-20261029/`。
- 本机日志/合成库：`target/v652-upgrade/`、`target/ui-20261029/`。

后两类目录被 Git 忽略，GitHub 克隆不包含它们；JSON 中的本机路径是证据定位信息，不是可从 GitHub 下载的附件。测试服务在验收后停止。

## 7. 服务器升级实施方案

本节是**尚未执行的 v0.65.2 服务器升级步骤**。以下环境信息来自既有部署记录，不是本次重新读取的在线状态。

| 环境 | 历史 SSH 入口 | 历史部署边界 |
| --- | --- | --- |
| UhooAI | `122.224.218.82:9622`；内网 `192.168.60.30` | `/home/uhoo/metabase`，完整 `compose.yaml`，应用服务 `metabase`，历史 PostgreSQL 17.11 |
| 企业 AI 门户 demo | `cntracer@122.224.218.82:5922` | `/home/cntracer/metabase-linux`，完整 `docker-compose.yml`，服务 `app`，应用库 `metabase_linux`，历史共享 PostgreSQL 17.6 |

两台环境不能互换配置。公网 HTTP/HTTPS、端口、Caddy 子路径、应用服务名、数据库版本和当前镜像应以实际目标复核为准；早期用户提供的 HTTPS 地址不能替代后来部署记录中的协议事实。

### 7.1 升级前核查与成功标准

1. 确定本次目标主机、应用目录和维护窗口，记录旧版本/hash、镜像/JAR、数据库及完整 Compose overlays。
2. 核对端口、网络、挂载、运行用户、JVM 参数、加密密钥引用、Keycloak 配置、`MB_SITE_URL`、Caddy 和门户 iframe 关系。
3. 记录用户、图表、仪表板、卡片、数据源、SSO 绑定及关键设置数量/摘要；保存代表性业务查询结果。
4. 定义验收：数据及权限保留、真实 SSO 登录/退出/切换、代表图表可查询、门户入口/子路径可用、指定定制生效且其他应用不被重建。

### 7.2 备份和副本预演

1. 备份完整部署配置、原 JAR/镜像引用及应用数据库；受保护配置和数据库备份只放受限目录，不上传 GitHub。
2. 实际检查备份可读性，恢复到独立 PostgreSQL 验证库；使用原长期加密密钥和完整必要配置运行新包迁移。
3. 对比对象数量、业务定义、权限、SSO 绑定和代表查询，记录迁移结果。
4. 用旧包和升级前副本演练恢复。H2 演练结果不能替代目标 PostgreSQL 备份恢复验证。

### 7.3 正式切换

1. 在维护窗口停止目标 Metabase 写入，另存最终停写快照，例如 `before-switch.dump`。
2. 核验上传 JAR 的 SHA-256；在目标环境原有运行镜像/构建链中替换 JAR，保留运行用户、启动命令和依赖。
3. 只修改目标应用的制品引用并重建该服务，使用现有完整 Compose/overlays，不用精简模板覆盖。
4. 保留原 PostgreSQL、数据卷、Keycloak、Caddy 及其他应用；不执行 `docker compose down -v`，不删除应用库重新 setup。
5. 若原 Dockerfile 从部署根目录 JAR 构建，同时更新该持久化构建来源，避免日后重建回到旧包。

仓库的 `bin/uhooai-deploy/` 和 `bin/portal-deploy/` 是历史 v0.64.x 部署辅助，包含旧版本/镜像/主机守卫；不能仅替换一个路径后当作已验证的 v0.65.2 一键升级脚本。

### 7.4 切换后验收

| 层次 | 必须观察的结果 |
| --- | --- |
| 进程/健康 | 启动完成、无迁移失败；健康接口正常；重启次数可解释 |
| 制品 | 运行 `v0.65.2 / f8047ea`；容器内 JAR SHA-256 与目标制品一致 |
| 数据 | 对象数量、图表定义、仪表板参数、数据源、权限及绑定摘要符合预期 |
| 登录/SSO | 真实 Keycloak 登录、会话刷新、A/B 切换、退出及撤销路径正确 |
| 页面 | 原业务仪表板、趋势/进度条、管理员设置、地图、权限帮助、嵌入入口符合方案 |
| 门户 | 经过门户入口打开 `/metabase/`，资源/跳转/iframe 均可用 |
| 查询 | 代表业务查询实际执行成功，不能只看已有缓存结果 |
| AI | 如果本次配置模型，另行验证真实问数和历史；没有配置时如实留待验收 |

已有实例不应为检查 setup 而清库。setup 默认和锁定通过独立新库验证；旧实例匿名采集配置需单独核对，不假定升级包已把原存储值改成 false。健康接口、登录重定向或 SSO 开关启用都不能代替以上浏览器和业务验收。

## 8. 回滚与数据保护

跨版本迁移后，回滚需要旧程序与对应数据库快照配套：

1. 停止目标应用写入，并先保存升级后的数据库和配置，供追溯或后续提取新增数据。
2. 选定升级前最终快照、匹配的旧制品、完整配置和原加密密钥。
3. 将升级前快照恢复到且仅到目标应用库；恢复对应 Compose/JAR/镜像引用，再启动应用。
4. 检查旧版本、数据摘要、SSO、代表仪表板和查询。

**恢复旧快照会使快照之后的新写入不出现在回退库中。** 执行恢复前必须明确这部分数据如何处理；不能仅换回旧 JAR 连接已迁移的库。当前仅有历史记录中的隔离回退演练，不宣称本轮已经对正式服务器完成回滚或 v0.65.2 PostgreSQL 回退演练。

## 9. 后续官方版本升级流程

1. **建立基线**：固定官方 tag/完整提交，保留当前开发分支、发布包、校验值和对应记录。
2. **形成三方差异**：旧官方 → 旧定制、旧官方 → 新官方；按品牌、图表、管理员、setup、SSO 和翻译分类。
3. **逐项决策**：沿用、由原生替代、暂不启用、需重写；上游已有会话历史不重复移植，Qwen 未获需求时不新增适配。
4. **重点审查**：认证/会话 API、加密、迁移 ID、模块依赖、Embedding Hub、CSS module、翻译上下文、许可条件和组件入口。
5. **最小迁移**：在新版结构内修改，不带回旧安全/会话实现，不为隐藏菜单改变权限。
6. **分层验证**：定向单测、类型/lint/翻译、完整构建、制品检查、副本迁移、实际浏览器、真实目标环境验收。
7. **发布与部署分离**：源码发布、安装包生成、服务器切换分别记录；每一步只报告实际完成的结果。

尤其要复查新增上游页面中独立渲染的帮助/推广入口，以及不经过 `ExternalLink` 的 Link、Anchor、按钮。简体中文仍按对象语义审查，不能全局把“问题”替换成“图表”。

## 10. GitHub 发布与维护

- 远端：`https://github.com/chengang900-glitch/kanban.git`；发布入口：`main`。
- 本地开发分支：`customization/uhooai-v0.65.2`；本地发布分支：`publication/kanban-v0.65.2`。
- 本地开发仓库为浅克隆。为保留 kanban 既有 main 历史，源码首次以快照提交 `3ab6c942b93036c07db044eeaffcae4d99b2a54a` 正常快进发布，父提交为旧 main `0f3ecb18873c5d47b5b67eddcc33bd0cccec1d74`。
- 该首次快照的源码 tree 与本地 `5ba4f10354baf5bab617435d358524ed409c5439` 完全一致；它不是把官方 Metabase 全部历史重新上传。后续文档提交以 main 最新历史为准。
- 不强推覆盖远端；每次发布核对远端 main SHA、本地发布 SHA，以及发布 tree 与预期本地 tree 一致。
- 首次源码发布前，205 个相对官方基线的定制文件通过敏感令牌扫描。
- JAR、原始截图、日志、依赖、数据库及私有运行配置未上传。当前仓库不是 JAR 下载站；需要分发安装包时使用另行确认的制品渠道，并携带 SHA-256。

旧阶段文档中的“未推送”“当前版本”“当前构建输出”等描述只代表当时快照。当前版本和状态以本文、当前源码与最终制品记录为准；部署状态仍须查相应服务器记录并实时复核。

## 11. 已知限制与待验收事项

- v0.65.2 最新定制包尚未部署服务器，未对生产 PostgreSQL 执行迁移或恢复。
- 未执行真实模型调用；保留新版 AI 不等于已经完成模型接入或 Qwen 兼容验证。
- 最终 UI 包未重做真实 Keycloak、跨账号、统一注销和 LibreChat 门户全链路生产验收。
- 历史企业 AI 门户记录中，`/portal/data` 在 Metabase 升级前已存在 LibreChat `t.replace is not a function` 白屏；本轮没有修复或重新确认其在线状态。
- 嵌入入门页部分上游新增文案仍为英文，如 `Create your first embed`；271 条调整针对图表对象已有中文译文，不是整站全部新文案汉化。
- 未跑完整上游测试集，未完成全部移动端、SDK、导出、拖拽和业务查询组合的回归。
- 菜单/帮助隐藏不等于功能移除；setup 开关禁用也不等于撤销管理员权限或覆盖已有配置。

## 12. 关联记录

| 记录 | 用途 |
| --- | --- |
| [v0.64.2.5 定制迁移](UHOOAI_V64_MIGRATION.md) | 首轮定制分类与原生替代决策 |
| [v0.64.2.5 本地验收](UHOOAI_V64_ACCEPTANCE.md) | 品牌、图表、SSO 与边界证据 |
| [v0.64.2.5 生产部署](UHOOAI_V64_DEPLOYMENT.md) | 历史 UhooAI 部署记录 |
| [v0.64.3 升级](UHOOAI_V643_UPGRADE.md) | 历史升级、备份与回退演练 |
| [第一组管理员九项定制](UHOOAI_ADMIN_UI_20261025.md) | 6bd491e 管理员页面和历史部署验收 |
| [企业 AI 门户 v0.64.3 部署](PORTAL_METABASE_V643_6BD491E_DEPLOYMENT_20261026.md) | 5922 环境独立部署与历史门户异常 |
| [v0.65.2 迁移记录](UHOOAI_V652_UPGRADE.md) | 新版兼容处理和首次隔离迁移证据 |
| [v0.65.2 首次验收 JSON](UHOOAI_V652_VERIFICATION.json) | 首次制品和测试数据 |
| [setup、链接与术语定制](UHOOAI_V652_SETUP_UI.md) | 最新九项定制的专项说明 |
| [最终验收 JSON](UHOOAI_V652_SETUP_UI_VERIFICATION.json) | f8047ea 制品、测试、运行与页面检查 |
