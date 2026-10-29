# UhooAI Metabase v0.64.2.5 定制方案（用户已确认）

日期：2026-10-18。用户已确认本地实施和新建 Git 仓库；本轮执行源码、测试、构建及隔离验收。远程生产切换单独记录，不推送远程仓库。

## 1. 已核实的目标和参考基线

| 项目 | 本次核实结果 |
| --- | --- |
| 目标服务器 | 公网 `122.224.218.82:9622` 登录后为 `uhooai / 192.168.60.30` |
| 公网入口 | `https://122.224.218.82:9443/metabase`；9443 映射服务器 443 |
| Metabase 运行版本 | `/api/session/properties` 返回 `v0.64.2.5 / 43a24f6 / 2026-10-14` |
| 官方源码目标 | tag `v0.64.2.5`，commit `43a24f64f0e522aaeb6f3b2cf39001c6e451bc56` |
| PostgreSQL | 实际查询返回 `17.11 (Debian 17.11-1.pgdg13+2)` |
| 健康接口 | 当前内网 `192.168.60.30:3000/api/health` 返回 `{"status":"ok"}` |
| 站点配置 | `site-url` 为上述公网地址；当前 `site-locale=zh_CN` |
| 旧版源码 | `/Users/chengang/Documents/metabase/metabase-v0.63.19`，当前 HEAD `7521b2d0`；工作区干净 |
| 旧版官方基线 | tag `v0.63.19`，commit `d7ac0abea18703302b5e99986f6668a09d0f4947` |

旧版参考依据为迁移工具包 `CUSTOMIZATION_MANIFEST.md`、实际源码差异及最后追加的 Keycloak 邮箱绑定实现。旧文档中的 v0.63.14 测试结果不作为本次新版验收证据；旧环境的 issuer、client、账号、数据库和 URL 不带入当前服务器。

本次对照覆盖关键源码路径和官方版本说明，并非已完成全量迁移审计。没有登录管理员界面，没有调用实际模型；HTTP 健康和源码检查不代表 UI、SSO 或业务验收通过。

## 2. 用户已确定的范围

| 主题 | 决策 | 实施原则 |
| --- | --- | --- |
| 新版 AI | 完整保留 | 保留新版 provider、模型配置、Agent、工具、协议、提示词和推理展示逻辑 |
| Qwen | 暂不接入 | 不迁移旧版 OpenAI Compatible、协议切换和兼容重试补丁 |
| 会话历史 | 使用原生能力 | 不迁移旧版列表、恢复、持久化和 profile 隔离补丁 |
| 默认中文 | 需要定制 | 默认简体中文，保留用户显式语言选择 |
| AI问数导航 | 需要定制 | 左侧增加入口，复用新版原生 AI exploration 页面和权限判断 |
| Keycloak SSO | 需要定制 | 移植旧版独立 OSS 接入行为，适配新版认证、会话和安全实现 |
| 趋势图、进度条 | 需要定制 | 恢复旧版视觉特征，保留新版计算、响应式布局和交互 |
| Metabase 品牌与 Pro 推广 | 需要定制 | 重新定位新版入口与可见文案，按展示层处理 |
| Logo | 需要定制 | 建议沿用旧版动态站点名称方案，详见第 6 节 |

## 3. AI 与 Qwen：本轮不迁移旧补丁的依据

新版 `src/metabase/llm/provider.clj` 已改为连接列表和 provider registry，支持多个 provider 和同类型的多个连接；旧版的单一 OpenAI Compatible 表单不能整块覆盖新版配置页。

新版已有 `src/metabase/metabot/self/vllm.clj`：支持自定义 Base URL、可选 API Key、模型发现、工具调用与强制工具调用预检、上下文检查、超时控制和推理流。共享 Chat Completions 解析器已识别 `reasoning` 与 `reasoning_content`。因此，旧版为本地模型补齐的若干通用能力已被新版覆盖。

但“新版具备 vLLM 接入”不等于“任意 Qwen 服务均兼容”：

- 本地 Qwen 是否可用仍取决于推理服务的工具解析器、思考模式及强制工具调用支持。
- 官方 OpenRouter 列表里的 Qwen 模型与直接连接百炼、DashScope 或本地 Qwen 是不同接入路径。
- 新版结构化输出仍使用 `tool_choice: required`；不能仅凭新增 provider 就断言旧的 thinking/tool_choice 冲突消失。
- 旧补丁的有限重试把 tool_choice 改为 auto，不能不经验证移入新版的结构化输出流程。

用户已选择“暂不接入，先完整保留新版 AI”，所以本轮无需验证实际 Qwen，也不增加兼容配置项。今后若接入，再以实际服务做定向验证，只处理原生能力无法覆盖的差异。

原生会话接口已具备列表、详情、profile 查询、state、fork 等结构；本轮完全使用原生历史实现，不带回旧版 API schema 或会话重建代码。

## 4. 图表定制

### 4.1 趋势图 SmartScalar

新版并非完全沿用旧结构：已引入 `ScalarCardShell`、分级尺寸、`TrendComparisonList`、`TrendComparisonRow` 和 `TrendSymbol`。建议在新版布局上恢复旧版视觉规则，不覆盖为旧组件。

拟保留：

- 卡片圆角、边框、适度阴影、左侧强调线及淡色背景效果。
- 强调色遵循旧版 `error > success > brand` 的优先级，沿用新版实际比较结果及颜色设置。
- 新版数字、标题、趋势符号、比较列表、自适应尺寸、悬浮提示、点击钻取和操作按钮。

### 4.2 进度条 Progress

新版主体结构与旧版官方结构接近，主要涉及格式化导入和组件注册方式调整，适合做局部视觉迁移。

拟保留旧版效果：

- 胶囊形进度条和百分比。
- 完成段由配置色 `progress.color` 派生浅色与深色，按从左到右连续渐变，不硬编码蓝色。
- 0%、小进度、100%、超额完成、空数据和隐藏背景模式仍遵守新版计算及显示规则。

主要路径为 `dashboard/components/DashCard/`、`visualizations/visualizations/SmartScalar/`、`visualizations/visualizations/Progress/` 及新版 ScalarCardShell。普通数字卡与通用卡片外观仅作保持旧版视觉一致性所需的局部适配。

样式限定主应用卡片作用域；公开分享、静态嵌入、SDK 嵌入不被全局 CSS 连带改变。原来已回滚的浅色画布 `#F1F0F5` 不恢复。

验收：浅色/深色、大小卡片、浏览/编辑、拖拽、隐藏背景、颜色设置和钻取；进度条另检查 0/小值/100/超额/空值。

## 5. 品牌文字、商业推广与菜单

按新版重新列清单，分三层处理：共享推广组件、独立页面/导航、散落文案与角标。不能仅屏蔽一个共享组件就宣称全部清理完成，也不采用全局文本替换或 CSS 隐藏来代替定位。

拟处理：

- 用户可见产品名：中文“数据看板”，其他语言“Dashboard”；登录标题简化为“登录”。
- 默认 Metabase 标识、确认范围内的 Powered by 展示、升级/试用/Pro/Cloud/购买套餐推广及商业钻石角标。
- 管理后台的商业推广卡、帮助菜单和新手引导中对应的品牌/推广入口。
- 付费功能占位：避免留下无功能的空卡和通往购买页面的按钮；隐藏推广不解锁对应付费能力。
- AI 页面只处理同类品牌和推广展示，不改变原生 provider 列表、模型配置和使用流程。

新版差异要求：

- `SettingsNav` 已重组认证子菜单，并存在受限的 Remote sync、Appearance、License、Cloud 等入口，需按实际 OSS 页面重新核对。
- `AppBanner` 包含升级、授权、试用、支付、只读、开发模式和 Security Center 等分支。仅处理品牌与商业推广；保留只读维护、实际错误、安全和必要操作警告。
- Monitor 以及新版可正常使用的认证、数据工作室和可视化功能不能按旧版菜单黑名单整体隐藏。
- 文档/帮助链接逐项判断用途；模型服务配置、错误处理或安全设置所必需的说明和链接保留。

保留源码技术标识、API 路径、字段、迁移、版权与许可证文本。所有业务名称、用户内容和用户自定义报表标题不做替换。

验收：管理员与普通用户；登录、首页、导航、设置、Monitor、数据工作室、AI、分享与嵌入入口；同时检查必要说明与错误提示仍存在。源码搜索只作为候选定位，最终以实际可见页面判断。

## 6. Logo 与登录外观

旧版最终实现主要是“用后台 site-name 替换固定 Logo”，并非简单替换一张图片。旧清单的静态 Logo 全量替换项已标为“不默认重做”。

建议本轮沿用该行为：

- 登录页、主 AppBar、管理导航显示后台站点名称。
- 管理区保留“管理中心”，文字颜色与新版导航背景适配。
- 长名称在导航内截断并可查看完整名称；登录页可换行，不改变 Logo 链接行为。
- 默认产品名称做本地化回退；实现时额外验证名称未加载、默认值和长名称，避免空白品牌区域。
- 登录 Fluent 背景沿用旧资源；如新版组件结构变化，只适配布局。
- 另外盘点 favicon、加载画面和邮件等可能残留品牌的场景；图片 Logo 或 favicon 若需全新图形，先明确现有素材，不在本轮自行设计。

## 7. 默认中文与 AI问数导航

默认中文：当前实例已有 `site-locale=zh_CN`，这是现有运行配置，不能当作官方源码默认值已定制。新版定制应覆盖新实例和未主动选语言的新用户，同时尊重用户显式选择的语言；保持中文语言包的构建流程，不用旧语言包覆盖新版。

AI问数导航：新版 `NewMenuItemAIExploration.tsx` 仍通过 `Urls.newQuestion({ mode: "ask" })` 进入 `/question/ask`。新增左侧入口时复用这一原生入口，受新版 AI/NLQ 与数据访问权限控制。新会话操作使用新版原生状态流程，不迁移旧历史逻辑，不删除已有会话，也不放宽后台数据权限。

验收：管理员和普通用户、有/无 NLQ 权限、有/无数据访问权、AI 未配置/已配置、新会话与历史恢复互不干扰；刷新和 `/metabase` 前缀路径正常。

## 8. Keycloak 单点登录

新版通用 OIDC 的基础 provider 在 OSS 源码中，但完整通用入口位于 Enterprise，且显式检查 `sso-oidc` 功能许可。不能仅添加环境变量就替代旧版独立 OSS Keycloak 扩展。本轮迁移旧版独立实现，保留新版官方认证、会话、安全中间件的有效变更，不启用或改写商业许可判断。

拟保留的旧版行为：

- Authorization Code + PKCE S256，严格检查 state、nonce、issuer、audience、签名和 token 有效期。
- 身份长期绑定使用 `issuer + sub`；管理员显式绑定、解除绑定及冲突拒绝。
- 沿用旧版最后追加的已验证邮箱首次绑定：仅 `email_verified=true`，且唯一活动账号匹配、无已有身份冲突时绑定；不自动开户，不提升权限，不改用户组。
- 使用 Metabase 原生个人会话，保留本地密码登录；到期、退出和解除绑定按规则撤销相关会话。
- 保留受签名和防重放检查保护的 back-channel logout。
- 同源 iframe 能力仅在配置启用时开放，匹配本站 `https://122.224.218.82:9443`；不沿用旧服务器 origin 和 issuer。
- 如现有门户身份核对接口能直接复用，验证其 issuer/sub 与 Metabase 一致；如不兼容，先列出所需门户改动，再单独确认范围。

外部 callback 方案为 `https://122.224.218.82:9443/metabase/auth/keycloak/callback`；实际 issuer、独立 client、logout URL 和可信 return path 在实施时按本环境核对。凭据不进入方案、源码或日志。

数据库影响：旧扩展有四张 `oss_keycloak_*` 表，并关联原生 `auth_identity`、`core_session`；因此 SSO 不是纯前端修改。需按新版迁移组织补充独立 changeset，保留全部官方 migration。先检查目标库是否已有扩展表，再验证全新官方 v64 库和可能的旧定制库路径，避免重复建表或 changeset 标识冲突。不能承诺用旧 JAR 直接回退已经改变的数据库。

验收：真实管理员和两个普通账号、首次绑定/重复登录/冲突/停用、错误 issuer/nonce/签名、回调重放、本地及统一退出、旧会话 API 拒绝访问、账号切换和超时；如使用门户嵌入，额外验证身份核对、查询、保存和导出。健康接口或登录跳转不能替代这些验收。

## 9. 确认后的实施顺序与交付

1. 建立官方 `v0.64.2.5` 独立源码目录和定制分支 → 验证：基线完整 SHA 一致，旧版源码保持只读。
2. 制作“旧官方→旧定制”与“旧官方→新官方”的逐项对照，只选择本方案范围 → 验证：每项补丁有保留/原生替代/不迁移的结论，AI 和历史旧补丁明确排除。
3. 按品牌/中文/推广、导航、图表、SSO 分主题实施 → 验证：相关前端、后端、类型与权限检查通过；SSO 单独验证迁移和负向用例。
4. 构建独立 OSS 制品 → 验证：JAR 完整性、内部版本、SHA-256、临时实例初始化和接口检查。
5. 用生产应用库备份的隔离副本验收 → 验证：恢复可用、账号/报表/设置保留、新增 SSO 结构和浏览器流程通过。
6. 提交制品、改动清单、截图、验收与回退说明 → 验证：能明确区分源码检查、隔离运行、真实 UI 和业务结果；生产切换单列部署步骤。

本方案确认前停留在分析阶段。实施成功后也不把“构建通过”或“容器健康”表述为真实 SSO、图表或业务验收完成。

## 10. 关键证据链接

- [官方 v0.64.2.5 发布与提交](https://github.com/metabase/metabase/releases/tag/v0.64.2.5)
- [指定版本 AI provider registry](https://github.com/metabase/metabase/blob/v0.64.2.5/src/metabase/llm/provider.clj)
- [指定版本 vLLM 适配器](https://github.com/metabase/metabase/blob/v0.64.2.5/src/metabase/metabot/self/vllm.clj)
- [指定版本支持的 AI providers](https://github.com/metabase/metabase/blob/v0.64.2.5/docs/ai/providers.md)
- [指定版本原生会话接口](https://github.com/metabase/metabase/blob/v0.64.2.5/src/metabase/metabot/api/conversations.clj)
- [指定版本趋势图组件](https://github.com/metabase/metabase/blob/v0.64.2.5/frontend/src/metabase/visualizations/visualizations/SmartScalar/SmartScalar.tsx)
- [指定版本进度条组件](https://github.com/metabase/metabase/blob/v0.64.2.5/frontend/src/metabase/visualizations/visualizations/Progress/Progress.tsx)
- [指定版本 AI exploration 原生入口](https://github.com/metabase/metabase/blob/v0.64.2.5/frontend/src/metabase/metabot/components/NewMenuItemAIExploration.tsx)
- [指定版本设置导航](https://github.com/metabase/metabase/blob/v0.64.2.5/frontend/src/metabase/admin/settings/components/SettingsNav/SettingsNav.tsx)
- [指定版本应用提示横幅](https://github.com/metabase/metabase/blob/v0.64.2.5/frontend/src/metabase/common/components/AppBanner/AppBanner.tsx)
- [指定版本通用 OIDC 入口及许可检查](https://github.com/metabase/metabase/blob/v0.64.2.5/enterprise/backend/src/metabase_enterprise/sso/api/oidc.clj)

旧版本地参考：`/Users/chengang/Documents/metabase/METABASE_MIGRATION_KIT/CUSTOMIZATION_MANIFEST.md`、`metabase-v0.63.19/METABASE_CUSTOMIZATION_PLAN.md`、`metabase-v0.63.19/docs/keycloak-portal/README.md`，以及当前 HEAD 的实际源码。
