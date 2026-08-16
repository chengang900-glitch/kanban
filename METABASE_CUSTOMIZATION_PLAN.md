# Metabase 定制优化重施计划

> 本文件是 v0.63.2 定制基线的总控文档。下一次升级时，应先阅读本文件，再按主题计划重新定位、迁移和验证；不得把旧文件直接覆盖到新版本。
> 需求发生冲突时，以用户最后一次确认、当前实际源码和日期较新的最终收口计划为准；旧计划保留实施历史，但不得覆盖后续规则。

## 1. 当前基线

| 项目            | 内容                                                   |
| --------------- | ------------------------------------------------------ |
| 官方版本        | `v0.63.2`                                              |
| 官方基线 commit | `9a6cadd7ffbf8d294737300b35d7167234bb7049`             |
| 定制分支        | `customization/v0.63.2-migration`                      |
| 本轮迁移日期    | `2026-08-01` 至 `2026-08-03`                           |
| 当前源码目录    | `/Users/chengang/Documents/metabase/metabase-v0.63.2`  |
| 上一版参考目录  | `/Users/chengang/Documents/metabase/metabase-master`   |
| 当前状态        | 工作区含尚未提交的迁移改动，不能仅依赖 commit 历史恢复 |

旧版 `metabase-master/METABASE_CUSTOMIZATION_PLAN.md` 和 `METABASE_UPGRADE_CHECKLIST.md` 保留为历史快照，不再继续修改。以后每个目标版本都在该版本项目根目录维护同名文件。

## 2. 两份根目录文档的职责

- `METABASE_CUSTOMIZATION_PLAN.md`：说明“为什么改、改了什么、当前状态、实现边界、详细计划在哪里”。
- `METABASE_UPGRADE_CHECKLIST.md`：下一次升级时逐项执行和验收，记录哪些已迁移、被新版原生替代、暂缓或废弃。
- `docs/superpowers/plans/`：保存每个主题的详细实施步骤、文件范围、测试命令和完成记录。

状态定义：

| 状态                | 含义                                               |
| ------------------- | -------------------------------------------------- |
| V：v0.63.2 已验证   | 已在当前源码中实施，并完成对应自动化验证           |
| H：历史确认，待迁移 | 旧版本存在，但本轮尚未迁移到 v0.63.2               |
| P：待核实/待开发    | 需求存在，但需要重新确认或尚未形成完整实现         |
| D：不默认重做       | 已回滚、已废弃或仅作为评估项保留                   |
| O：运维任务         | 构建、部署、备份和运行环境任务，不属于产品源码功能 |

## 3. v0.63.2 本轮迁移总览

| 批次 | 主题                                           | 状态 | 详细记录                                                                            |
| ---- | ---------------------------------------------- | ---- | ----------------------------------------------------------------------------------- |
| 1    | 品牌、登录页、导航与新手引导                   | V    | `docs/superpowers/plans/2026-08-01-v0.63.2-brand-navigation-migration.md`           |
| 2    | 匿名统计、数据库帮助、权限试用卡、模型帮助入口 | V    | `docs/superpowers/plans/2026-08-01-v0.63.2-help-upsell-cleanup-migration.md`        |
| 3    | 后台管理页面外部文档链接                       | V    | `docs/superpowers/plans/2026-08-01-v0.63.2-admin-doc-links-migration.md`            |
| 4    | 权限页面外部文档链接                           | V    | `docs/superpowers/plans/2026-08-01-v0.63.2-permissions-doc-links-migration.md`      |
| 5    | 试用、升级和 Powered by Metabase 提示          | V    | `docs/superpowers/plans/2026-08-01-v0.63.2-commercial-prompts-migration.md`         |
| 6    | 商业卡片与次要外链清理（后续统一隐藏）         | V    | `docs/superpowers/plans/2026-08-01-v0.63.2-confirmed-commercial-links-migration.md` |
| 7    | OpenAI Compatible 提供商与提供商可见策略       | V    | `docs/superpowers/plans/2026-08-01-v0.63.2-openai-compatible-provider-migration.md` |
| 8    | thinking/tool_choice 有限重试                  | V    | `docs/superpowers/plans/2026-08-01-v0.63.2-thinking-tool-choice-retry-migration.md` |
| 9    | OpenAI Compatible 的 Responses API 协议        | V    | `docs/superpowers/plans/2026-08-01-v0.63.2-openai-compatible-responses-protocol.md` |
| 10   | 剩余品牌、AI 历史与仪表板视觉迁移              | V    | `docs/superpowers/plans/2026-08-02-v0.63.2-remaining-customizations-migration.md`   |
| 11   | 最终品牌、菜单、商业推广、资料与图表文案收口   | V    | `docs/superpowers/plans/2026-08-03-v0.63.2-final-ui-branding-cleanup.md`            |

## 4. 主题一：品牌、Logo 与导航

### BRAND-01 使用站点名称替代固定 Logo

- 状态：V
- 目标：登录页、主应用 AppBar、管理员导航统一显示后台配置的 `site-name`。
- 当前范围：
  - `frontend/src/metabase/auth/components/AuthLayout/AuthLayout.tsx`
  - `frontend/src/metabase/auth/components/AuthLayout/AuthLayout.styled.tsx`
  - `frontend/src/metabase/nav/components/AppBar/AppBarLogo.tsx`
  - `frontend/src/metabase/nav/components/AppBar/AppBarLogo.styled.tsx`
  - `frontend/src/metabase/nav/components/AdminNavbar/AdminNavbar.tsx`
- 规则：登录页允许换行；导航区域单行截断并保留完整 `title`；不改变原链接和导航行为。

### BRAND-02 管理员品牌区域

- 状态：V
- 规则：管理员站点名使用白色；大屏显示“管理中心”；不显示商店入口。

### BRAND-03 登录页纯色背景

- 状态：V
- 规则：移除登录页背景图片，使用系统背景色变量。

### BRAND-04 用户界面的产品名称统一

- 状态：V
- 最终规则：中文界面中用户可见的产品名称统一为“数据看板”；其他语言统一为“Dashboard”（首字母大写）。
- 覆盖前端语言包、后端国际化消息、浏览器标题、主程序、管理员页面、数据工作室和用户页面。
- setup 初始化全流程中的用户可见产品名同样遵循该规则：中文显示“数据看板”，其他语言显示“Dashboard”。
- 登录页标题“登录 Metabase”简化为“登录”。
- 通过语言包构建和运行时可见消息转换统一处理，不修改代码变量、API、数据库字段、源码文件名、版权/许可证、商标文字和开发文档中的技术名称。

### BRAND-05 静态 Logo 文件替换

- 状态：D
- 当前以动态 `site-name` 为主，不默认替换静态资源。只有新版出现无法通过站点名称覆盖的品牌场景时才重新定位。

### NAV-01 左侧导航增加“AI问数”

- 状态：V
- 规则：有自然语言问数权限且有数据访问权时显示；进入 `/question/ask`；点击时重置问数会话；桌面端保持导航展开。
- 当前范围：`frontend/src/metabase/nav/containers/MainNavbar/MainNavbarContainer/MainNavbarView.tsx` 及对应测试。

### NAV-02 隐藏新手引导入口

- 状态：V
- 隐藏 Getting Started、How to use Metabase、Add your data 等入口。

### NAV-03 帮助菜单只保留键盘快捷键

- 状态：V
- 用户帮助子菜单只显示“键盘快捷键”；“获取帮助”“下载诊断信息”“关于 Metabase/Dashboard”等项目不渲染。
- 管理工具的帮助页不显示“获取帮助”“报告问题”“获取专家帮助”和“出错的问题”等推广或外部支持入口。

### NAV-05 隐藏受限、商业和版本更新菜单

- 状态：V
- 管理员设置导航不显示远程同步、软件版本更新、自定义可视化、外观、许可证、Cloud 和 Google 身份验证入口；对应更新、Cloud、许可证直达页面返回 Not Found。
- 数据工作室不显示带钻石或受限的内容库、Schema viewer、依赖关系图、依赖项诊断和设置远程同步。
- 仪表板信息侧栏不显示“洞察”标签；保留概览和历史记录。

### NAV-04 移除升级/商店入口

- 状态：V
- 旧版清单中的独立任务编号曾在 v0.63.2 文档整理时遗漏；实际行为已由管理员品牌导航和商业提示清理共同实现。
- 保持独立追踪，防止后续升级只验证页面内容而漏掉导航入口。

## 5. 主题二：帮助链接与商业提示清理

### CLEAN-01 后台管理外部文档链接

- 状态：V
- 已处理 AI/MCP、模型持久化和缓存、常规设置、Embedding SameSite、云迁移等确认范围。
- 原则：保留说明文字、设置、警告和业务行为，只移除确认属于 Metabase 外部文档的链接。

### CLEAN-02 权限页面外部文档链接

- 状态：V
- 已处理应用权限、集合权限、数据权限帮助，以及权限迁移提示和旧权限弹窗中的外部链接。
- 保留内置帮助内容、迁移说明、控制项和保存行为。

### CLEAN-03 后台帮助和试用区域

- 状态：V
- 已处理数据库页帮助区域、数据库连接表单帮助区域、权限高级版试用卡。

### CLEAN-04 升级、试用和品牌提示

- 状态：V
- 最终范围包括所有钻石图标、免费试用、免费升级、升级专业版、Metabase Pro/Cloud、购买/查看套餐、迁移推广、专家支持、存储购买和软件版本更新推广。
- 共享 Upsell、UpgradeModal、Embedding 提示、Powered by Metabase badge、SDK 升级展示、Transform/Python、AI managed provider、上传、邮箱、缓存、身份验证和常规设置中的推广均不渲染。
- 保留安全、法律、只读维护、开发模式和必要操作警告；保留调用接口和周边布局，避免破坏上游状态流程。

### CLEAN-05 匿名使用统计说明

- 状态：V
- 只隐藏匿名统计这一项的说明，保留标题、开关和异步保存行为。

### CLEAN-06 模型创建页“什么是模型？”

- 状态：V
- OSS、Enterprise、Premium 场景均不显示该外链。

### CLEAN-07 商业卡片统一隐藏

- 状态：V
- 2026-08-03 最终确认覆盖旧规则：不再保留商业卡片标题和说明。
- Whitelabel、Remote Sync、Cloud、许可证、缓存、上传、邮箱、身份验证等商业推广卡片及其链接统一隐藏；底层功能实现不因界面隐藏而删除。

### CLEAN-08 下载格式说明精简

- 状态：V
- 下载弹窗启用“保留数据格式”时，示例只显示日期和金额，不再显示“就像在 Metabase/Dashboard/数据看板中一样”的产品对比短语。
- 下载格式、格式化开关和实际导出行为保持不变。

### PROFILE-01 用户资料、本地化与默认语言

- 状态：V
- 默认语言为 `Chinese (China)`，新用户第一次登录默认使用该语言。
- 所有引用社区翻译提示的用户页面均不显示该提示。
- 个人资料中“姓”字段位于“名”字段上方，字段含义和保存键保持不变。

## 6. 主题三：AI 提供商与 Metabot

### AI-01 OpenAI Compatible 提供商

- 状态：V
- 支持 Base URL、API Key、模型发现、手工模型名、连接验证、保存、修改和断开。
- 后端入口：
  - `src/metabase/llm/settings.clj`
  - `src/metabase/metabot/settings.clj`
  - `src/metabase/metabot/self.clj`
  - `src/metabase/metabot/self/openai_compatible.clj`
  - `src/metabase/metabot/self/chat_completions.clj`
  - `src/metabase/metabot/api.clj`
- 前端入口：`frontend/src/metabase/metabot/components/AIProviderConfigurationForm/`。

### AI-02 提供商可见范围

- 状态：V
- 管理员 AI 设置页和前台/弹窗配置页都只显示 `OpenAI Compatible`。
- Anthropic、Azure、Bedrock、OpenAI、OpenRouter 和 Metabase managed provider 不在用户界面中显示；底层 provider 实现不删除，以降低升级迁移风险。

### AI-03 thinking 与 tool_choice 冲突的有限重试

- 状态：V
- 仅限 Chat Completions。
- 只处理 HTTP 400，且错误必须同时包含 `thinking`、`tool_choice` 和不支持语义。
- 最多重试一次，第二次把 `tool_choice` 改为 `auto`。
- `invalid tool_call_id`、429 和 5xx 不触发该重试。

### AI-04 流式错误输出

- 状态：V（v0.63.2 上游能力）
- v0.63.2 已具备 AI SDK 结构化流式错误输出，本轮没有重复改写该逻辑。

### AI-05 Metabot 使用站点名称作为身份

- 状态：V
- 系统提示词和无显式名称时的身份回退均使用实例 `site-name`，不再把通用 Metabot 身份写死为 Metabase。

### AI-06 中文免责声明

- 状态：V
- 中文免责声明已迁移为：`内容由AI生成，请复核结果。`

### AI-07 历史对话持久化与恢复

- 状态：V
- 已补齐 conversation/message 持久化后的可恢复 `history` 与 `state`，并覆盖工具调用、工具结果、中断调用、错误占位和已删除消息的重建边界。
- 会话列表和详情按参与者隔离；前端已接入历史列表、新建会话、选择恢复、原 conversation ID 复用和异常状态。
- AI助手与AI问数共用既有 conversation/message 持久化表，不新增数据库表或迁移；AI助手历史固定查询 `profile-id=internal`，AI问数历史固定查询 `profile-id=nlq`。
- 会话列表和详情 API 均校验 `profile-id`，避免AI助手与AI问数的历史记录交叉显示或恢复到错误入口。
- AI问数完整页面已增加历史对话入口，支持查看、新建和恢复原 conversation ID、messages、history 与 state。
- 详细实施计划：`docs/superpowers/plans/2026-08-02-v0.63.2-remaining-customizations-migration.md`。

### AI-08 OpenAI Compatible 的 Responses API

- 状态：V
- 管理员明确选择 `Chat Completions` 或 `Responses API`；默认仍为 `Chat Completions`。
- 不自动探测协议，不进行跨协议回退。
- Responses 分支复用 v0.63.2 已有的 OpenAI request builder 和流转换器，覆盖文本、工具调用、usage 和终止错误。
- DeepSeek 官方线上实测需要有效 API Key，本轮只完成协议级自动化验证。

### AI-09 建议提示词使用中文

- 状态：V
- 后台 AI 设置页重新生成 Metabot 建议提示词时，模型和数据模型两类生成模板均明确要求输出自然的简体中文。
- 业务名称优先转换为自然中文；专有名词、通用缩写和不宜翻译的标识可以保留原文。
- 该规则只影响重新生成的建议提示词；已保存的旧英文提示词需点击“重新生成建议的提示词”后替换。

## 7. 主题四：仪表板与图表视觉

以下主题已迁移到 v0.63.2 并完成对应自动化验证：

| 编号  | 内容                                                | 状态                  |
| ----- | --------------------------------------------------- | --------------------- |
| UI-01 | 主应用仪表板卡片统一圆角、边框、背景和阴影          | V                     |
| UI-02 | Question 卡片浏览态透明边框，保留编辑反馈           | V                     |
| UI-03 | SmartScalar 卡片外壳和强调线                        | V                     |
| UI-04 | SmartScalar `error > success > brand` 语义色        | V                     |
| UI-05 | Scalar 数字卡视觉样式                               | V                     |
| UI-06 | Progress 配置色浅色到深色渐变胶囊、百分比和兼容模式 | V                     |
| UI-07 | 浅色画布 `#F1F0F5`                                  | D，已回滚，不默认重做 |
| UI-08 | 仪表板隐藏“洞察”；Share 中文统一为“分享”            | V                     |
| UI-09 | Treemap 中文名称为“矩形树图”                        | V                     |

迁移时必须保持普通主应用、编辑态、公开嵌入、静态嵌入和 SDK 嵌入的作用域边界，不允许通过修改全局主题变量实现局部效果。

UI-06 最终规则与本轮补充修正：

- Progress 已完成进度段只使用图表设置 `progress.color` 派生的浅色和深色，从左向右按 `90deg` 连续渐变；不得插入固定蓝色或额外的中间主色节点。
- 颜色派生继续复用 `getProgressColors` 输出的 `--progress-chart-light-color` 和 `--progress-chart-dark-color`，不新增固定色值。
- 本次只调整主应用 Progress 已完成进度段的渐变；圆角、百分比、未完成区域、完成/超额完成状态、隐藏背景兼容模式、计算、目标和点击交互保持不变。
- 实现位置：`frontend/src/metabase/dashboard/components/DashCard/DashCard.module.css`；`Progress.tsx` 既有颜色变量传递逻辑未改动。

## 8. 构建、部署与运行

| 编号   | 任务                                         | 状态                                |
| ------ | -------------------------------------------- | ----------------------------------- |
| OPS-01 | JDK 25 完整前端和 Uberjar 构建               | V，Docker 完整构建通过              |
| OPS-02 | `unzip -tq`、JAR 大小和 SHA-256 记录         | V，JAR 完整性已验证                 |
| OPS-03 | Docker 部署与 API 健康检查                   | V，容器启动和版本接口已验证         |
| OPS-04 | Windows Java `--add-opens` 与 Java 25 路径   | O，Windows 部署时复核               |
| OPS-05 | PostgreSQL 应用数据库配置和避免误入 `/setup` | O，当前本机测试使用持久化 H2 volume |

任何文档都不得保存数据库密码或 AI API Key。

## 9. 本轮验证记录

- 各迁移计划中的任务均已勾选，并保存了对应测试与检查步骤。
- 最后一批 AI 协议回归：194 个后端测试、735 个断言，0 failures、0 errors。
- AI Provider 前端测试：58 个测试全部通过。
- AI-07 后端聚焦回归：60 个测试、212 个断言，0 failures、0 errors。
- AI-07 与仪表板视觉前端聚焦回归：5 个测试套件、74 个测试全部通过。
- AI-07 AI问数历史补充回归：前端 2 个测试套件、6 个测试通过；后端历史接口完整测试套件 14 个测试、42 个断言通过，其中新增 `profile-id` 列表与详情隔离测试共 2 个测试、7 个断言。
- AI问数历史补充修改通过 TypeScript、ESLint、Clj-kondo、Clojure 格式和前端格式检查。
- UI-06 渐变补充修正通过 Progress 定向测试（1 个测试套件、2 个测试）和 Prettier 检查；`git diff --check` 无错误。
- TypeScript、ESLint、Clojure 格式、前端格式和 `git diff --check` 通过。
- 完整前端生产构建、静态可视化、AOT 和 Uberjar 构建成功。
- JAR 大小 `662237011` 字节，SHA-256 `5bc1634a818a76ef3a6cfb3e6b021f2b96779238e2a6fa81b41e89962d162ec8`，`unzip -tq` 通过；JAR 内包含 388 个 `metabase/analysis_agent` 条目及本轮生产前端资源。
- 2026-08-03 在完成AI问数历史对话功能后，使用显式版本 `v0.63.2` 重新执行 `:version`、`:frontend`、`:uberjar` 完整生产构建；最新 JAR 为 `target/uberjar/metabase.jar`，大小 `662313999` 字节，SHA-256 `ee892f80afcad58cac7134561770f92c3a05b8602c1012146098514ac41f30cf`，`unzip -tq` 通过，内部 `version.properties` 为 `tag=v0.63.2`、`hash=9a6cadd`。该产物尚未部署。
- Docker 镜像 `metabase-ui-test:v0.63.2` 已于 2026-08-02 全新部署到容器 `metabase-v0632-test`，镜像 ID `sha256:169633a69f2a1cafa0996159ac202910943b1fb0ac71f97bb54b809ccdb61464`；旧容器、旧镜像标签和旧 H2 数据卷均已删除，新卷 `metabase-v0632-test-data` 为空白初始化状态；`/api/health` 返回正常，版本接口为 `v0.63.2`。
- 尚未完成：真实 DeepSeek Responses API 调用、Windows/PostgreSQL 目标环境验证，以及浅色、深色、编辑态和嵌入态的完整人工页面巡检；UI-06 还需用多个图表配置色人工确认渐变中不再出现固定蓝色。

## 10. 下一版本重施顺序

1. 建立官方新版本的干净 Git checkout，记录 tag 和 commit SHA。
2. 复制本文件与 `METABASE_UPGRADE_CHECKLIST.md` 到新项目根目录，先把所有 V 项重置为“待研判”。
3. 检查新版是否已原生提供同类能力，分别标记“原生替代、需要迁移、不再适用”。
4. 按品牌导航、帮助商业提示、AI 设置与协议、仪表板视觉的顺序分主题迁移。
5. 每个主题先更新测试，再做最小实现；禁止直接覆盖旧文件。
6. 每个主题保存独立计划、测试结果和 Git commit/patch。
7. 完成构建、JAR 校验、真实数据库、真实 AI provider、浅深色主题和嵌入场景回归。
8. 更新根目录两份总控文件，形成新版本基线。

## 11. 工程资产要求

- 根目录两份总控文档必须随源码版本提交。
- `docs/superpowers/plans/` 中的主题计划必须保留。
- 每个主题建议独立 Git commit，并可额外导出 `customization/<theme>/<task-id>.patch`。
- 不把构建后的 `resources/frontend_client/app/dist` 当作源码迁移依据。
- 当前工作区尚未提交；提交前需再次核对完整 diff，避免把无关改动混入迁移基线。

## 12. 外部辅助资产（不进入 Metabase 编译）

- `TOOL-01`：历史环境中的外部辅助工具/脚本，只作为独立运维资产记录，不属于产品源码迁移。
- `TOOL-02`：历史环境中的外部辅助工具/脚本，只作为独立运维资产记录，不属于产品源码迁移。
- 这两项不会出现在 Metabase JAR 或前端 bundle 中；后续如需恢复，应单独核对其原始目录、用途和安全边界，不能用产品编译结果判断是否迁移。
