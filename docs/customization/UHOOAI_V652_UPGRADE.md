# UhooAI Metabase v0.65.2 本地升级记录

验收日期：2026-10-29。范围为本地源码、OSS JAR 和隔离验证；未连接或修改 UhooAI、企业 AI 门户等服务器，也未推送远程 Git。

## 版本与交付位置

- 官方基线：[v0.65.2](https://github.com/metabase/metabase/releases/tag/v0.65.2)，提交 `86e10edfb72a553851c39ef73f53b5c0f09a38b3`。
- 安装包版本：`v0.65.2 / e134ef6`；产品源码提交 `e134ef6e13db7c7a692ccfaeacb80386c6186dca`。后续验收文档提交不改变包内源码版本。
- 本地分支：`customization/uhooai-v0.65.2`。
- 仓库目录保持 `/Users/chengang/Documents/UhooAI服务器/metabase-v0.64.2.5`，避免破坏现有路径。
- 固定发布包：`target/releases/v0.65.2-e134ef6e/metabase.jar`；当前构建输出为 `target/uberjar/metabase.jar`，两者为同一制品的硬链接。
- 大小：715,874,150 字节；SHA-256：`26ef58bc04b39c75016d6772327752a3624829007459e6e0426ceb70a0c3b60e`。
- ZIP 全部 304,874 个条目 CRC 校验通过；包含 Keycloak changeset、迁移后的 SSO 路由包装和扩展类，无 Enterprise 后端。
- 旧分支 `customization/uhooai-v0.64.3` 保留；旧 `v0.64.3 / 6bd491e` JAR 保存于 `target/releases/v0.64.3-6bd491e/metabase.jar`，SHA-256 为 `b2605d1d8c04b90c334c0c249d186d22ef6fcb56737be58185b9c9c115ffae61`。

## 定制迁移

以官方 v0.65.2 建立新分支，用官方 v0.64.3 到旧定制的差异进行三方补丁迁移，旧分支完整保留。延续中文默认、站点名称/Logo/登录背景、商业推广隐藏、AI问数导航、趋势图/进度条样式、独立 OSS Keycloak 和此前九项管理员定制。

| 新版变化 | 迁移结果 |
| --- | --- |
| `server/auth_wrapper` 移入 SSO 模块 | Keycloak 路由迁入 `sso/auth_wrapper`，保留上游路由注入结构 |
| Web 层不再依赖 SSO | 同源嵌入开关通过设置 API 读取；会话验证经 session 模块公开 API 接入，保留新版 `session-key-hash` 与原生会话流程 |
| 原嵌入设置改为 Embedding Hub | 隐藏“外观/主题”入口、未授权商业导航及引导卡片；保留原路由、权限、许可和条款判断 |
| 新嵌入引导页有未进入官方词库的品牌文案 | 改用通用说明并补简体中文；隐藏主题创建及营销 Demo，保留基础嵌入、可用的 AI 配置和技术文档 |
| AppBar 改用 CSS module | 将文字品牌、宽度和内边距迁到新版组件及样式，保留原生导航间距 |
| 数据库增加测试连接能力 | 保留“测试连接”，只移除用户指定的帮助入口 |

`src/metabase/metabot`、`src/metabase/llm`、`frontend/src/metabase/metabot` 与官方目标无差异。AI 和会话历史沿用新版；未加入 Qwen 或旧会话历史补丁。官方数据库迁移文件未改，仅保留与旧定制完全一致的独立 Keycloak changeset。

## 检查与构建

- 前端：30 个套件、421 项测试通过，覆盖管理员、导航、品牌、嵌入、数据库表单及图表。
- 后端核心回归：156 项、853 条断言通过；最终认证/会话/安全/模块边界复查：136 项、9,039 条断言通过。两组有重叠，不相加计数。
- 翻译构建：5 项、27 条断言通过，保留新版上下文与参数校验。
- TypeScript、定向 Oxlint、格式检查、提交 hooks、`git diff --check` 通过。
- 工具链采用 Node 22.23.4、Bun 1.3.14、Java 25.0.3。依赖 lockfile 不变；下载截断的依赖经官方校验值验证后补齐。
- 完整 OSS 构建完成 version、translations、frontend、licenses、python、uberjar；嵌入页面补审后，重新完成 version、translations、frontend、uberjar，许可证和 Python 依赖未发生后续变化。包内 sqlglot 为官方固定的 30.20.0。
- 地图安全测试仅在隔离测试进程配置 `MB_MAP_TILE_SERVER_ALLOWED_NETWORKS=allow-all`，避免本机 DNS 导致设置恢复失败；产品网络校验未改。
- 上游反射/Unsafe 和包体积提示仍存在，未关闭相关检查。

构建日志、测试明细、原始合成库和快照位于忽略目录 `target/v652-upgrade/`。机器可读交付记录见 [UHOOAI_V652_VERIFICATION.json](UHOOAI_V652_VERIFICATION.json)。

## 数据迁移与实际页面

先用旧 6bd491e JAR 创建独立合成 H2 库，清洁停止并备份，再用新版迁移。固定回环 Issuer 和测试加密密钥，不继承生产 `MB_*` 配置。

- 前后 3 个可见用户、47 个问题、重点仪表板的 8 张卡片、2 个显式 SSO 绑定，以及站点名称和中文语言设置均保留。
- 问题名称、查询结构及引用关系、显示类型、可视化设置与归档状态一致。原始查询 JSON 的 `lib/uuid` 每次读取都会生成，已用同版本重复读取确认；仅将声明的内部 UUID 及其精确引用映射为声明路径后比较，未忽略业务字段或查询条件。
- 最终 JAR 对 6 张进度卡和 2 张趋势卡，以 `ignore_cache: true` 发起查询，全部 completed，共返回 104 行；0、1、65、100、125、NULL 语义正确，NULL 仍按原生显示为 0。
- 最终包浏览器复查常规、域名、本地化、数据库表单、AI/MCP、帮助、嵌入入门、安全和图表，共 9 个页面。指定文案和隐藏项符合要求；趋势图常规/反向颜色、进度渐变及目标状态正常，AI问数导航保留。
- SameSite 控件在 OSS 中遵循新版许可条件；授权场景的 HTTPS 提示保留、了解更多链接移除，由定向单测覆盖。
- 使用本地 RSA 签名的 OIDC 测试替身完成 A、B 登录和切换，分别进入个人集合 5、6；同源 iframe 可用，签名 backchannel 注销后旧会话回到登录页。CSP `frame-ancestors 'self'` 与 `X-Frame-Options: SAMEORIGIN` 已确认。

截图和页面断言在 `output/playwright/v652-upgrade/`，包括 `dashboard.png`、`help-version.png`、`embedding-get-started.png` 和 `browser-final.json`。本次回环测试服务在交付前停止。

## 验证边界

这不是生产 PostgreSQL 数据迁移、真实 Keycloak 或 LibreChat 门户联调验收。未配置模型、未执行真实 AI 问数；未运行完整上游测试集，也未进行全部移动端、SDK、导出和业务查询回归。新版部分原生新文案仍有英文，未进行整站重译。

服务器升级需另行核对目标环境、备份、现有加密/会话配置及回退数据库。旧 v0.64.3 部署脚本保留为历史版本，本次未修改或执行；不能仅把旧 JAR 指向已迁移的新数据库进行回退。
