# v0.63.14 定制版 → v0.63.19 定制版迁移记录

## 当前状态

源码迁移、自动化验证、完整 OSS 生产构建及隔离 H2 运行验收已完成；未部署。本文件是本轮状态的唯一入口；继承的 v0.63.14 和 v0.63.2 文档只作为需求与历史证据，不能作为 v0.63.19 验证证明。

## 基线与保护范围

- 官方仓库：`https://github.com/metabase/metabase.git`
- 官方标签：`v0.63.19`
- 官方提交：`d7ac0abea18703302b5e99986f6668a09d0f4947`
- 新目录：`/Users/chengang/Documents/metabase/metabase-v0.63.19`
- 新分支：`customization/v0.63.19-migration`
- 本轮生产源码实现提交：`5e60b25a45cd588d285fa2ab164263d9ed5f1dcc`
- 定制来源：`/Users/chengang/Documents/metabase/metabase-v0.63.14`
- 来源 HEAD：`c3f074a8`；来源实现提交：`9242607104125eed26b76bbd7eb4bfbf10aeb999`
- 来源官方基线：`8429d62a0609369653c4598ff832e5e174f609a5`
- 来源工作区开始时干净，保持只读；没有部署，没有接触生产 application database。
- 官方仓库同时有 v0.63.19.1 标签，本轮严格使用用户指定的 v0.63.19，不擅自改目标。

## 可复用迁移步骤

1. 官方目标标签独立 clone，核对完整 SHA，新建定制分支。
2. 从旧仓库只读获取旧官方标签和旧定制引用，使用 `fetch --update-shallow` 处理浅克隆；不在旧仓库 fetch 或改动。
3. 审计 `旧官方 → 旧定制` 和 `旧官方 → 新官方` 两组差异，计算重叠路径。
4. 以 `git diff --binary` 生成完整定制差异，使用 `git apply --3way` 应用到新官方基线。
5. 按主题审查自动合并和文本冲突。安全、认证、权限、schema、官方 migration 优先采用新版。
6. 用 APFS copy-on-write 独立复制 node_modules 缓存，再使用新版 `bun install --frozen-lockfile`；不共享可写依赖，也不复制旧前端 bundle 或 JAR。
7. Clojure 可读性、模块配置生成、格式/lint、TypeScript 与前后端定向回归。
8. 使用目标工具链进行完整 OSS 生产构建、JAR ZIP/哈希校验及临时 H2 初始化。
9. 更新根目录迁移工具包快照，交付源码、产物和明确的人工验收边界。

## 差异与冲突判断

- 来源定制差异：488 个文件；9384 行新增、6677 行删除。
- 官方 v0.63.14 → v0.63.19：1333 个文件变化。
- 两组差异重叠：32 个文件；9 个文本冲突文件。
- 官方 `resources/migrations` 文件保持 v0.63.19 原样。
- `.clj-kondo/config/modules/config.edn` 经模块生成器和测试审查后与官方一致：删除无对应源码的 analysis-agent 失效登记，并不再导出已移除的 query-processor.reducible 命名空间。这是原生配置替代，不是丢失产品功能。

| 冲突文件 | 合并结论 |
| --- | --- |
| EmbeddedMetabotUpsell.tsx | 保留不渲染商业卡片的定制 |
| AppBanner.tsx | 保留只读/开发模式提示；商业、升级和授权 banner 继续隐藏 |
| BehaviorCard.tsx | 保留文档链接可见性守卫，采用新版仅含 page 的文档参数结构，不恢复已移除的 anchor 字段 |
| AdminNavbar.unit.spec.tsx | 合并新版数字键导航测试和自定义站点名称测试 |
| metabot/agent/core.clj | 保留新版终止错误处理，叠加定制的达到迭代上限错误 |
| metabot/tools/entity_details.clj | 保留新版权限缓存和 eager mapv；保留定制 question 提示词来源 |
| metabot/tools/util.clj | 保留新版路由目的数据库过滤，叠加定制问题/仪表板提示词来源 |
| metabot/tools/util_test.clj | 两组测试均保留 |
| session/api_test.clj | 保留新版 AuthIdentity 密码重置测试，使用定制中文邮件断言 |

## 主题覆盖

品牌与登录 Fluent 背景、site-name、中文产品名和默认语言、姓在名前、AI问数导航、帮助和商业入口隐藏、OpenAI Compatible、明确协议选择和有限重试、中文建议提示词、会话持久化/历史/恢复/profile 隔离、仪表板/SmartScalar/Scalar/Progress/分享/矩形树图均保留。隐藏 provider UI 不删除底层新版 provider。

## 验证证据

- 前端初轮：128 套件，900 测试；876 通过，24 个旧断言失败。按实际定制行为修正 15 个套件后，最终全轮 128 套件、900 测试、2 snapshots 全部通过。
- 修正内容仅涉及测试：教程链接/视频隐藏、商业卡片隐藏、姓在名前、产品名和初始化文案、Google 认证卡隐藏、许可证及 Cloud 直达页隐藏。
- CloudPanel 的内部迁移流程仍测试，使用 test-only 触发器替代已隐藏的商业入口；未删除底层迁移代码或跳过测试。
- 后端核心回归：357 测试、1629 断言，最终全轮全部通过。首次 1 个限流秒数计时断言失败，单独及全轮复测通过；没有修改限流实现或放宽原断言。
- 后端补充回归：175 测试、481 断言全部通过，覆盖 Metabot schema/settings、查询构造、搜索权限、姓名、邮件和页面路由。初轮 2 个旧断言失败：Welcome to Metabase 已从新版翻译源移除，改用仍存在的 Metabase account 验证品牌翻译；SSO 未初始化错误按实际品牌译文 Dashboard 断言。仅改测试，不改翻译或权限实现。
- 模块边界：10 测试、4121 断言全部通过。
- 完整 Clojure lint：0 errors、0 warnings；Clojure 格式和冲突文件可读性通过。
- `bun install --frozen-lockfile` 与新版 ClojureScript 开发编译通过。静态差异检查与官方 migration 保留检查通过。
- TypeScript：项目规定的 8 GiB 全量检查通过。初次 3 GiB 堆配置不足，后续类型检查发现 BehaviorCard 引用新版已移除的 anchor 字段，修正后重新通过。当前工具环境无 TypeScript Language Server 接口，不能宣称已执行 LSP 验证。
- ESLint：全部迁移 TS/JS 文件通过（0 errors、0 warnings；项目忽略的 global.d.ts 由 tsc 验证）。Oxfmt 全量 12013 文件检查通过。
- 默认中文语言设置：15 测试、22 断言全部通过，未设置 `MB_SITE_LOCALE=en`。
- Git 对象连通性 `git fsck --connectivity-only --no-dangling` 通过。
- 旧定制 488 路径中，487 路径仍有定制差异；唯一原生替代路径是已说明的模块配置文件；新增本轮记录文件。非 Markdown 源码 patch SHA-256（含测试）：`c0b665079b6837509326a6e2ba96020cc9b99b071817a89992e77d308a44ab22`。

按用户指定的已有迁移方案保存本地实现提交，以供 JAR 内部 hash 溯源；不推送、不部署。实现提交后仅更新两处测试断言及验证文档；生产源码未变，不要求重建 JAR。

## 最终构建产物

- JAR：`target/uberjar/metabase.jar`
- 大小：`661776931` 字节。
- SHA-256：`549def4a90c36895786689a885d634b3a53116d464275e7516fe9112b6175a0e`。
- 内部版本：`v0.63.19 / 5e60b25 / 2026-10-03`。
- 完整构建与 `unzip -tq` 均通过，Enterprise Edition extensions 不存在。
- 构建有上游 ClojureScript macro/reflection 及浏览器兼容性数据过期提示，非构建失败；未擅自更新官方锁定依赖。

## 隔离运行与资料归档

- 2026-10-03 使用 Java 25、独立端口 `127.0.0.1:33419`、全新临时 H2 文件启动；通过 `env -i` 排除既有数据库连接及其他环境配置。
- 日志确认 `Database Migrations Current`、`Metabase Initialization COMPLETE`；初始化完成时 JVM uptime 13.9 秒。
- `/api/health`：HTTP 200，`{"status":"ok"}`。
- `/api/session/properties`：HTTP 200，版本 `v0.63.19 / 5e60b25 / 2026-10-03`，默认语言 `zh_CN`。只保存过滤后的非敏感字段，未保存 setup-token。
- `/auth/login`：HTTP 200，仅确认页面可响应，不代表已完成浏览器视觉验收。
- 本次临时实例已停止，不改变旧实例与现有 application database。
- 根目录 `METABASE_MIGRATION_KIT/reference/v0.63.19/` 保存本记录快照、完整定制补丁、非 Markdown 源码补丁、复现命令、测试/构建日志及隔离接口结果。

## 人工与部署验收边界

真实 PostgreSQL 恢复库升级、既有数据保留、Windows 启动、真实 AI provider 多轮调用、登录后的浏览器品牌/导航/图表视觉及实际部署均需在目标环境验收。本轮不执行这些生产变更。
